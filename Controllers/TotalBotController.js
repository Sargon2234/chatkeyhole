import { BotEventEmitter } from '../Helpers/BotEventEmitter';
import { TextHelper } from '../Helpers/Text';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';
import { AuthorizationHelper } from '../Helpers/Authorization';
import { CommandController } from './Command';
import { listenBotCommands } from '../src/listenBotCommands';
import { publisherBotCommands } from '../src/publisherBotCommands';
import { LocalCache } from '../Helpers/UserCache';
import { CallbackController } from './Callback';
import { ChannelHelper } from '../Helpers/Channel';
import { MessageHelper } from '../Helpers/Message';
import { Queue } from '../Helpers/QueueService';
import { GroupMessageChatMessage } from '../Models/GroupMessageChatMessage';
import { GroupModel } from '../Models/Group';
import { UserModel } from '../Models/User';
import { messageBroadcast } from '../Helpers/MessageBroadcast';

export class TotalBotController {
  constructor(db) {
    this.ee = BotEventEmitter;
    this.userCache = LocalCache;
    this.textHelper = new TextHelper(db);
    this.messageHelper = new MessageHelper();
    this.telegramInteractor = new TelegramInteractor();
    this.authorization = new AuthorizationHelper(db, this.textHelper, this.telegramInteractor);
    this.commandController = new CommandController(db);
    this.callbackController = new CallbackController(this.textHelper, this.telegramInteractor, this.userCache);
    this.channelHelper = new ChannelHelper(db, this.textHelper, this.telegramInteractor, this.authorization);
    this.groupModel = new GroupModel(db);
    this.userModel = new UserModel(db);
    this.groupMessageChatMessageModel = new GroupMessageChatMessage(db);
    this.messagesToProcess = {};
    this.messagesWithIdMap = {};
    this.messageChatsWithDates = [];
  }

  // Here we use queue logic. FIFO. One message per channel.
  async publishMessageToDependentChannels(messageData) {
    const message = JSON.parse(messageData);

    // Verify if chat is open for message processing. Important, we lock GROUP, not channel.
    // So, if there is new messages from different group for this channel, there will be no conflicts.
    const currentQueueStatus = Queue.checkInQueue(message.chat_id);

    // Chat is closed. Means, currently processing one message.
    if (currentQueueStatus) {
      // We have to save newly received message for processing later.
      // But we receive messages from different channels, so we store it to list for current chat id.

      // Create empty list for messages in chat.
      if (!this.messagesToProcess[message.chat_id]) {
        this.messagesToProcess[message.chat_id] = [];
      }

      // If we have already registered this message id for this chat id
      if (this.messagesToProcess[message.chat_id].includes(message.message_id)) {
        return;
      }

      // If this is first message data associated with channel
      if (!this.messagesWithIdMap[message.chat_id]) {
        this.messagesWithIdMap[message.chat_id] = {};
      }

      // Save message associated with this message id
      this.messagesWithIdMap[message.chat_id][message.message_id] = message;

      // Add new message id
      this.messagesToProcess[message.chat_id].push(message.message_id);

      // Resort array of messages for this channel. Ascending order, send lowest message id. (means the oldest one)
      // We don't use date here, because we could receive same date time for two different messages
      this.messagesToProcess[message.chat_id].sort((a, b) => a - b);

      // Now we have to add this channel and message to chats with dates.
      // We need this to send always oldest messages.
      this.messageChatsWithDates.push({ date: message.date, chat_id: message.chat_id });
      // And resort array to use always oldest messages
      this.messageChatsWithDates.sort((a, b) => a.date - b.date);

      return;
    }

    // Set lock
    Queue.setLock(message.chat_id, true);

    try {
      const group = await this.groupModel.getChatsForGroup(message);

      if (!group.length) {
        Queue.setLock(message.chat_id, false);
        return;
      }

      console.log('\n===> Message to publish', messageData, '\n');

      let messageActions = [];

      for (const channelsToPublish of group) {
        // If there is no chat id, skip and go to next message
        if (!channelsToPublish.chat) {
          continue;
        }

        // const userNameForMessage = await this.userModel.getUserByTgId(message);
        // const textToSendBeforeData = userNameForMessage[0].user_name;

        // For reply messages logic looks like this:
        // 1. Get message id from db
        // 2. Publish response but with reply_to_message_id from step 1.
        // AND IMPORTANT: we have to do the same operation for all channels.
        if (message.additional_data.reply_message) {
          const replyMessageData = message.additional_data.reply_message;

          let messageToReplyOnInDb = await this.groupMessageChatMessageModel.getChatMessageId(replyMessageData, channelsToPublish);

          // We didn't save this message,
          // so we have to save it and retry our work.
          if (!messageToReplyOnInDb.length) {
            // We published not stored message
            // BUT IMPORTANT -> publish only to current channel. Because message could be available in other channels.
            // AND we can't execute same function because there will be dead lock!

            await messageBroadcast(this.userModel, channelsToPublish.chat, replyMessageData.message_to_save);

            // and check again for it's availability to response.
            messageToReplyOnInDb = await this.groupMessageChatMessageModel.getChatMessageId(replyMessageData, channelsToPublish);
          }

          if (!messageToReplyOnInDb.length) {
            console.log('\n====>Probably, some error in reply to message', messageData, '\n\n');
            return;
          }

          message.additional_data.reply_to_message_id = messageToReplyOnInDb[0].chat_message_id;

          messageActions.push(messageBroadcast(this.userModel, channelsToPublish.chat, message));
          continue;
        }

        messageActions.push(messageBroadcast(this.userModel, channelsToPublish.chat, message));
      }
      await Promise.all(messageActions);
    } catch (e) {
      console.log('Error in processing message to broadcast', e.message);
    } finally {
      // Release lock
      Queue.setLock(message.chat_id, false);
    }

    // Here we have to check if we have pending messages to publish
    // get oldest one, publish and remove from queue
    if (this.messageChatsWithDates.length) {
      const messageDataInCacheWithDate = this.messageChatsWithDates.shift();
      const messageKey = this.messagesToProcess[messageDataInCacheWithDate.chat_id].shift();
      // Reassign message data to new object for processing
      const messageDataInCache = Object.assign({}, this.messagesWithIdMap[messageDataInCacheWithDate.chat_id][messageKey]);
      this.messagesWithIdMap[messageDataInCacheWithDate.chat_id][messageKey] = null;

      await this.publishMessageToDependentChannels(JSON.stringify(messageDataInCache));
    }
  }

  async processIncomingRequest({ body }) {
    if (body.inline_query) {
      console.log('Received strange', JSON.stringify(body.inline_query));
      return;
    }

    console.log('B', JSON.stringify(body));

    if (body.channel_post) {
      console.log('Message in channel');
      return;
    }

    const user = await this.authorization.getUser(body);

    if (!user) {
      console.log('Some error in user', user);
      return;
    }

    console.time('Process message took');

    try {
      await this.processData(body, user);
    } catch (e) {
      console.log('Listener error', e.message);
    } finally {
      console.timeEnd('Process message took');
    }
  }

  async processData({ message, callback_query }, user) {
    let messageToProcess = message;

    if (callback_query) {
      messageToProcess = callback_query.message;
      messageToProcess.callback_query = callback_query.data;
      messageToProcess.force_data_type = 'callback_query';
    }

    const chatData = this.parseChatData(messageToProcess);
    const messageData = this.messageHelper.parseMessageData(messageToProcess, chatData);

    console.log('Msg data', JSON.stringify(messageData));

    if (messageData.chat_id < 0) {
      messageData.chat_id = message.chat.id;

      if (message.left_chat_member) {
        console.log('User left chat');
        return;
      }

      if (message.new_chat_member) {
        console.log('User joined chat');
        return;
      }

      return this.processGroupMessage(messageData);
    }

    user.chat_id = messageData.chat_id;
    return this.processInBotMessage(messageData, user);
  }

  async processGroupMessage(messageData) {
    if (messageData.data_type === 'bot_command') {
      const user = {
        chat_id: messageData.chat_id,
      };

      await this.commandController.handleReceivedCommand(listenBotCommands, 'listener', messageData.data, user);

      return;
    }

    this.ee.emit('group_message', JSON.stringify(messageData));
  }

  async processInBotMessage(dataToProcess, user) {
    // Remove available callback buttons
    const availableMessageInCache = await this.userCache.getUserCacheMessage(user.id);

    if (availableMessageInCache) {
      const inlineKeyboardRemove = {
        message_id: availableMessageInCache,
        reply_markup: '',
      };

      await this.telegramInteractor.sendMessage(user.chat_id, 'editMessageReplyMarkup', inlineKeyboardRemove, 'options');
    }

    switch (dataToProcess.data_type) {
      case 'bot_command':
        return this.commandController.handleReceivedCommand(publisherBotCommands, 'publisher', dataToProcess.data, user);
      case 'callback_query':
        return this.callbackController.handleCallback(dataToProcess.data, user);
    }

    const userAction = this.userCache.getUserById(user.id);

    if (dataToProcess.data_type !== 'text') {
      const text = await this.textHelper.getText('not_understand', user);
      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    if (userAction) {
      this.userCache.removeCacheForUser(user.id);
    }

    switch (userAction) {
      case 'code':
        await this.authorization.useInviteCode(user, dataToProcess);
        break;
      case 'channel':
        await this.channelHelper.addNewChannel(user, dataToProcess);
        break;
      default:
        await this.commandController.handleReceivedCommand(publisherBotCommands, 'publisher', '/help', user);
    }
  }

  parseChatData({ chat, entities, force_data_type }) {
    console.log('CD', JSON.stringify(chat));
    const { id, title, type } = chat;

    const returnData = { chat_id: id, title, type };

    if (entities) {
      returnData.data_type = entities[0].type;
    }

    if (force_data_type) {
      returnData.data_type = force_data_type;
    }

    return returnData;
  }
}
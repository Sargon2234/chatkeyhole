import { BotEventEmitter } from '../Helpers/BotEventEmitter';
import { TextHelper } from '../Helpers/Text';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';
import { AuthorizationHelper } from '../Helpers/Authorization';
import { CommandController } from './Command';
import { listenBotCommands } from '../src/listenBotCommands';
import { publisherBotCommands } from '../src/publisherBotCommands';
import { LocalCache as UserCache } from '../Helpers/UserCache';
import { CallbackController } from './Callback';
import { ChannelHelper } from '../Helpers/Channel';
import { MessageHelper } from '../Helpers/Message';

export class TotalBotController {
  constructor(db) {
    this.ee = BotEventEmitter;
    this.dbConnection = db;
    this.textHelper = new TextHelper(db);
    this.messageHelper = new MessageHelper();
    this.telegramInteractor = new TelegramInteractor();
    this.authorization = new AuthorizationHelper(db, this.textHelper, this.telegramInteractor);
    this.commandController = new CommandController(db);
    this.userCache = UserCache;
    this.callbackController = new CallbackController(this.textHelper, this.telegramInteractor, this.userCache);
    this.channelHelper = new ChannelHelper(db, this.textHelper, this.telegramInteractor, this.authorization);
  }

  async publishMessageToDependentChannels(messageData) {
    // TODO: implement queue logic here for messages
    const message = JSON.parse(messageData);

    const group = await this.dbConnection('groups as g')
        .where('g.chat_id', '=', message.chat_id)
        .leftJoin('groups_with_channels as gwc', 'g.id', '=', 'gwc.group_id')
        .leftJoin('channels as c', 'gwc.channel_id', '=', 'c.id')
        .select('c.chat');

    if (!group.length) {
      return;
    }

    const messageActions = [];

    for (const channelsToPublish of group) {
      if (channelsToPublish.chat) {
        const userNameForMessage = await this.dbConnection('users')
            .where('tg_user_id', '=', message.id)
            .select('user_name');

        // We have bunch of files or some other data
        if (Array.isArray(message.data)) {
          // Sort files from bigger size to lower
          const filteredData = message.data.sort((a, b) => b.size - a.size)[0];
          const fileToSend = filteredData.file_id;

          console.log('F', fileToSend);

          const textToSendBeforeData = `${userNameForMessage[0].user_name}`;

          if (message.data_type === 'photo') {
            if (message.additional_data) {
              if (message.additional_data.type === 'caption') {
                message.additional_data.text = `${textToSendBeforeData}: ${message.additional_data.text}`;
              }
            } else {
              message.additional_data = {
                type: 'caption',
                text: textToSendBeforeData,
              };
            }
          }

          // await this.telegramInteractor.sendMessage(channelsToPublish.chat, 'sendMessage', textToSendBeforeData, 'text');

          switch (message.data_type) {
            case 'photo':
              await this.telegramInteractor.sendMessage(channelsToPublish.chat, 'sendPhoto', fileToSend, 'photo', message.additional_data);
              break;
          }

          console.log('Received data array');
          continue;
        }

        const textToSend = `${userNameForMessage[0].user_name}:\n${message.data}`;

        messageActions.push(this.telegramInteractor.sendMessage(channelsToPublish.chat, 'sendMessage', textToSend, 'text'));
      }
    }

    await Promise.all(messageActions);
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

    console.log('U', user);

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
    console.log('CD', chat);
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
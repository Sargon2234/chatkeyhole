import * as uuid from 'uuid/v1';

const CHANGE_NAME_ACTION = 'change_name';
import { TextHelper } from '../Helpers/Text';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';
import { UserHelper } from '../Helpers/User';
import { LocalCache } from '../Helpers/UserCache';

export class CommandController {
  constructor(dbConnection, availableCommands) {
    this.dbConnection = dbConnection;
    this.textHelper = new TextHelper(dbConnection);
    this.telegramInteractor = new TelegramInteractor(dbConnection);
    this.userHelper = new UserHelper(dbConnection);
    this.userCache = LocalCache;
    this.availableCommands = availableCommands;
  }

  async handleReceivedCommand(command, user, token) {
    if (!this.availableCommands.includes(command)) {
      return false;
    }

    switch (command) {
      case '/start':
        return this.handleStart(user, token);
      case '/useCode':
        return this.handleCode(user);
      case '/addChannel':
        return this.handleAddChannel(user);
      case '/getChannelCode':
        return this.handleGetChannelCode(user, token);
      default:
        return this.handleHelp(user);
    }
  }

  async handleStart(user, token) {
    const text = await this.textHelper.getText('help', user);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', token);
  }

  async handleHelp(user) {
    const text = await this.textHelper.getText('help', user);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }

  async handleAddChannel(user) {
    const text = await this.textHelper.getText('add_channel', user);

    this.userCache.setUserAction(user.id, 'channel');
    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
  }

  async handleCode(user) {
    const text = await this.textHelper.getText('wait_code', user);

    this.userCache.setUserAction(user.id, 'code');
    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
  }

  async channelOperations(user, subAction) {
    const userChannels = await this.dbConnection('user_channels').where('user_id', '=', user.id);

    if (!userChannels || !userChannels.length) {
      const text = await this.textHelper.getText('no_channels_name', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
      return;
    }

    const userChannelNames = await this.userHelper.channelsList(userChannels);
    const optionsAsInlineKeyboard = this.telegramInteractor.generateOptions(userChannelNames, subAction);
    const text = await this.textHelper.getText(subAction, user);

    await this.telegramInteractor.sendMessageWithOptions(user, optionsAsInlineKeyboard, text, process.env.BOT_PUBLISHER_TOKEN);
  }

  async handleGetChannelCode(user, token) {
    if (token !== process.env.BOT_WATCHER_TOKEN) {
      return;
    }

    const code = uuid().slice(0, 6);
    // Check if message came from group. If so, we already have all required data.
    if (user.chat_id < 0) {
      let groupDataFromDb = await this.dbConnection('groups').where('chat_id', '=', user.chat_id).select('group', 'id');

      // If we don't have such group, but received message from it, we have to register this group.
      if (!groupDataFromDb.length) {
        const chatDataFromTG = await this.telegramInteractor.getChatData(user.chat_id, token);

        if (!chatDataFromTG.ok) {
          console.log('Error in receiving chat data', chatDataFromTG);
          return false;
        }

        const groupData = {
          group: chatDataFromTG.result.title,
          chat_id: user.chat_id,
        };

        const insertDataResult = await this.dbConnection('groups').insert(groupData).returning('id');

        groupDataFromDb = [{ id: insertDataResult[0], group: groupData.group }];
      }

      const dataToInsert = {
        group_to_join: groupDataFromDb[0].id,
        invitation_code: code,
        status: 'created',
      };

      const registerInvitationCodeInDb = this.dbConnection('group_channel_invitations').insert(dataToInsert);

      const text = await this.textHelper.getText('add_user_code', user);
      const formattedText = text.replace('_channel_name_', groupDataFromDb[0].group);

      const textMessage = this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', formattedText, 'text', token);

      await Promise.all([
        registerInvitationCodeInDb,
        textMessage,
      ]);

      await new Promise(resolve => setTimeout(resolve, 300));

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', code, 'text', token);

      return;
    }

    // if don't, we have to ask which group user want to use
    // So, user provide group name, we check if user connected with this group, if don't, go away.
    // TODO:
  }
}
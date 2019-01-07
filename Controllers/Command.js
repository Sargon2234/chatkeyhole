import * as uuid from 'uuid/v1';
import { TextHelper } from '../Helpers/Text';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';
import { UserHelper } from '../Helpers/User';
import { LocalCache } from '../Helpers/UserCache';

export class CommandController {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
    this.textHelper = new TextHelper(dbConnection);
    this.userHelper = new UserHelper(dbConnection);
    this.userCache = LocalCache;
    this.telegramInteractor = new TelegramInteractor();
  }

  async handleReceivedCommand(availableCommands, botType, command, user) {
    command = command.trim();

    if (!availableCommands.includes(command)) {
      return false;
    }

    switch (command) {
      case '/start':
        return this.handleStart(user, botType);
      case '/useCode':
        return this.channelOperations(user, 'code2');
      case '/addChannel':
        return this.handleAddChannel(user);
      case '/getChannelCode':
        return this.handleGetChannelCode(user);
      default:
        return this.handleHelp(user, botType);
    }
  }

  async handleStart(user, botType) {
    const text = await this.textHelper.getText(`help_${botType}`, user);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }

  async handleHelp(user, token, botType) {
    const text = await this.textHelper.getText(`help_${botType}`, user);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }

  async handleAddChannel(user) {
    const text = await this.textHelper.getText('add_channel', user);

    this.userCache.setUserAction(user.id, 'channel');
    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }


  async channelOperations(user, subAction) {
    const userChannels = await this.dbConnection('user_channels')
        .where('user_id', '=', user.id)
        .select('channel_id');

    if (!userChannels.length) {
      const text = await this.textHelper.getText('no_channels_name', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    const userChannelNames = await this.userHelper.channelsList(userChannels);
    const optionsAsInlineKeyboard = this.telegramInteractor.generateOptions(userChannelNames, subAction);

    const text = await this.textHelper.getText('add_user', user);

    await this.telegramInteractor.sendMessageWithOptions(user, optionsAsInlineKeyboard, text);
  }

  async handleGetChannelCode(user) {
    const code = uuid().slice(0, 6);
    // Check if message came from group. If so, we already have all required data.
    if (user.chat_id < 0) {
      let groupDataFromDb = await this.dbConnection('groups').where('chat_id', '=', user.chat_id).select('group', 'id');

      // If we don't have such group, but received message from it, we have to register this group.
      if (!groupDataFromDb.length) {
        const chatDataFromTG = await this.telegramInteractor.getChatData(user.chat_id);

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

      const textMessage = this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', formattedText, 'text');

      await Promise.all([
        registerInvitationCodeInDb,
        textMessage,
      ]);

      await new Promise(resolve => setTimeout(resolve, 300));

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', code, 'text');

      return;
    }

    // if don't, we have to ask which group user want to use
    // So, user provide group name, we check if user connected with this group, if don't, go away.
  }
}
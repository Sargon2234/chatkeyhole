import { MessageHelper } from '../Helpers/Message';
import { CommandController } from './Command';
import { TextHelper } from '../Helpers/Text';
import { UserHelper } from '../Helpers/User';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';
import { UserCache } from '../Helpers/UserCache';
import { ChannelHelper } from '../Helpers/Channel';
import { CallbackController } from './Callback';
import { AuthorizationHelper } from '../Helpers/Authorization';

export class MainController {
  constructor(databaseConnection) {
    this.messageHelper = new MessageHelper();
    this.textsHelper = new TextHelper(databaseConnection);
    this.userHelper = new UserHelper(databaseConnection);
    this.userCache = new UserCache();
    this.telegramInteractor = new TelegramInteractor(this.userCache);
    this.authorizationHelper = new AuthorizationHelper(databaseConnection, this.textsHelper, this.telegramInteractor);
    this.channelHelper = new ChannelHelper(databaseConnection, this.textsHelper, this.telegramInteractor, this.authorizationHelper, this.userCache);
    this.commandController = new CommandController(databaseConnection, this.textsHelper, this.telegramInteractor, this.userHelper, this.userCache);
    this.callbackController = new CallbackController(databaseConnection, this.textsHelper, this.telegramInteractor, this.userCache, this.authorizationHelper);
  }

  async processIncomingRequest({ body }) {
    if (body.inline_query) {
      console.log('Received strange', JSON.stringify(body.inline_query));
      return;
    }

    let accessMessageData = 'message';
    let chatId;

    if ('callback_query' in body) {
      accessMessageData = 'callback_query';
      chatId = body[accessMessageData].message.chat.id;
    } else {
      chatId = body.message.chat.id;
    }

    const user = await this.userHelper.getUserData(body[accessMessageData].from, chatId);

    // Remove available callback buttons
    const availableMessageInCache = await this.userCache.getUserCacheMessage(user.id);

    if (availableMessageInCache) {
      const inlineKeyboardRemove = {
        message_id: availableMessageInCache,
        reply_markup: '',
      };

      await this.telegramInteractor.sendMessage(user.chat_id, 'editMessageReplyMarkup', inlineKeyboardRemove, 'options');
    }

    const dataToProcess = await this.messageHelper.parseMessage(body);

    if (!dataToProcess) {
      return false;
    }

    if (dataToProcess.type === 'command') {
      await this.commandController.handleReceivedCommand(dataToProcess.data, user);
      return;
    }

    if (dataToProcess.type === 'callback_query') {
      await this.callbackController.handleCallback(dataToProcess.data, user);
      return;
    }

    const userAction = this.userCache.getUserById(user.id);

    if (dataToProcess.type !== 'text') {
      const text = await this.textsHelper.getText('not_understand', user);
      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    if (userAction) {
      await this.userCache.removeCacheForUser(user.id);
    }

    const selectedChannel = await this.userCache.getUserSelectedChannel(user.id);

    switch (userAction) {
      case 'channel':
        await this.channelHelper.addNewChannel(user, dataToProcess);
        break;
      case 'changeName':
        await this.channelHelper.changeUserChannelName(user, selectedChannel, dataToProcess);
        break;
      case 'code':
        await this.authorizationHelper.useInviteCode(user, dataToProcess);
        break;
      case 'sendMessage':
        await this.channelHelper.sendMessageToChannel(user, selectedChannel, dataToProcess);
        break;
      default:
        await this.commandController.handleReceivedCommand('/help', user);
    }

  }
}
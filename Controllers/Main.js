import { MessageHelper } from '../Helpers/Message';
import { CommandController } from './Command';
import { TextHelper } from '../Helpers/Text';
import { UserHelper } from '../Helpers/User';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';
import { UserCache } from '../Helpers/UserCache';
import { ChannelHelper } from '../Helpers/Channel';
import { CallbackController } from './Callback';

export class MainController {
  constructor(databaseConnection) {
    this.messageHelper = new MessageHelper();
    this.telegramInteractor = new TelegramInteractor();
    this.textsHelper = new TextHelper(databaseConnection);
    this.userHelper = new UserHelper(databaseConnection);
    this.userCache = new UserCache();
    this.channelHelper = new ChannelHelper(databaseConnection, this.textsHelper, this.telegramInteractor);
    this.commandController = new CommandController(databaseConnection, this.textsHelper, this.telegramInteractor, this.userHelper, this.userCache);
    this.callbackController = new CallbackController(databaseConnection, this.textsHelper, this.telegramInteractor, this.userHelper, this.userCache);
  }

  async processIncomingRequest({ body }) {
    if (body.inline_query) {
      console.log('Received strange', JSON.stringify(body.inline_query));
      return;
    }

    console.log('B', body);

    let accessMessageData = 'message';
    let chatId;

    if ('callback_query' in body) {
      accessMessageData = 'callback_query';
      chatId = body[accessMessageData].message.chat.id;
    } else {
      chatId = body.message.chat.id;
    }

    const user = await this.userHelper.getUserData(body[accessMessageData].from, chatId);

    const dataToProcess = await this.messageHelper.parseMessage(body);

    console.log('DTP', dataToProcess);
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
    console.log('UA', userAction);

    if (userAction === 'channel') {
      this.userCache.removeCacheForUser(user.id);

      if (dataToProcess.type !== 'text') {
        const text = await this.textsHelper.getText('not_understand', user);
        await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
        return;
      }

      dataToProcess.data = dataToProcess.data.includes('@') ? dataToProcess.data : `@${dataToProcess.data}`;

      await this.channelHelper.addNewChannel(user, dataToProcess.data);
    }

    // const userData = await this.userHelper.getUser(dataToProcess.chat_id, dataToProcess);
    //
    // if (!userData) {
    //   return;
    // }
    //
    // if ('is_new' in userData || dataToProcess.data === '/start') {
    //   // If user is new, first of all we have to get his language.
    //   await this.messageActions.sendTextWithOptions(dataToProcess.chat_id, 'Оберiть мову / Выберите язык / Choose language 🇺🇦/🇷🇺/🇬🇧', 'language');
    //   return;
    // }
  }
}
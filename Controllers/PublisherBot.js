import { AuthorizationHelper } from '../Helpers/Authorization';
import { CommandController } from './Command';
import { publisherBotCommands } from '../src/publisherBotCommands';
import { LocalCache as UserCache } from '../Helpers/UserCache';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';
import { MessageHelper } from '../Helpers/Message';
import { TextHelper } from '../Helpers/Text';
import { CallbackController } from './Callback';
import { ChannelHelper } from '../Helpers/Channel';

export class PublisherBot {
  constructor(db) {
    this.messageHelper = new MessageHelper();
    this.dbConnection = db;
    this.authorization = new AuthorizationHelper(db);
    this.commandController = new CommandController(db, publisherBotCommands);
    this.userCache = UserCache;
    this.telegramInteractor = new TelegramInteractor(this.userCache);
    this.textsHelper = new TextHelper(db);
    this.channelHelper = new ChannelHelper(db, this.textsHelper, this.telegramInteractor, this.authorization, this.userCache);
    this.callbackController = new CallbackController(db, this.textsHelper, this.telegramInteractor, this.userCache, this.authorization);
  }

  async publishMessageToDependentChannels(messageData) {
    const message = JSON.parse(messageData);

    console.log('In publisher', message);

    const group = await this.dbConnection('groups as g')
        .where('g.chat_id', '=', message.chat_id)
        .leftJoin('groups_with_channels as gwc', 'g.id', '=', 'gwc.group_id')
        .leftJoin('channels as c', 'gwc.channel_id', '=', 'c.id')
        .select('c.chat');

    if (!group.length) {
      return;
    }

    if (!group[0].chat) {
      return;
    }

    console.log('G', group);
  }

  async processIncomingRequest({ body }) {
    if (body.inline_query) {
      console.log('Received strange', JSON.stringify(body.inline_query));
      return;
    }

    console.log('B', JSON.stringify(body));

    const user = await this.authorization.getUser(body);

    if (!user) {
      console.log('Some error in user', user);
      return;
    }

    console.log('U', user);

    // Remove available callback buttons
    const availableMessageInCache = await this.userCache.getUserCacheMessage(user.id);

    if (availableMessageInCache) {
      const inlineKeyboardRemove = {
        message_id: availableMessageInCache,
        reply_markup: '',
      };

      await this.telegramInteractor.sendMessage(user.chat_id, 'editMessageReplyMarkup', inlineKeyboardRemove, 'options', process.env.BOT_PUBLISHER_TOKEN);
    }

    const dataToProcess = await this.messageHelper.parseMessage(body);

    if (!dataToProcess) {
      return false;
    }

    switch (dataToProcess.type) {
      case 'command':
        return this.commandController.handleReceivedCommand(dataToProcess.data, user);
      case 'callback_query':
        return this.callbackController.handleCallback(dataToProcess.data, user);
    }

    const userAction = this.userCache.getUserById(user.id);

    if (dataToProcess.type !== 'text') {
      const text = await this.textsHelper.getText('not_understand', user);
      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
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
        await this.authorization.useInviteCode(user, dataToProcess);
        break;
      default:
        await this.commandController.handleReceivedCommand('/help', user);
    }
  }
}
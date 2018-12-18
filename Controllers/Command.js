const CHANGE_NAME_ACTION = 'change_name';
const ADD_USER_ACTION = 'add_user';
const SEND_MESSAGE_TO_CHANNEL = 'send_message';

export class CommandController {
  constructor(dbConnection, TextHelper, TelegramInteractor, UserHelper, UserCache) {
    this.dbConnection = dbConnection;
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
    this.userHelper = UserHelper;
    this.userCache = UserCache;
    this.availableCommands = [
      '/start',
      '/addUser',
      '/useCode',
      '/changeChatName',
      '/registerChannel',
      '/help',
      '/listChannels',
      '/sendMessage',
    ];
  }

  async handleReceivedCommand(command, user) {
    if (!this.availableCommands.includes(command)) {
      return false;
    }

    switch (command) {
      case '/start':
        return this.handleStart(user);
      case '/addUser':
        return this.channelOperations(user, ADD_USER_ACTION);
      case '/useCode':
        return this.handleCode(user);
      case '/changeChatName':
        return this.channelOperations(user, CHANGE_NAME_ACTION);
      case '/sendMessage':
        return this.channelOperations(user, SEND_MESSAGE_TO_CHANNEL);
      case '/registerChannel':
        return this.handleAddChannel(user);
      case '/listChannels':
        return this.handleListChannels(user);
      default:
        return this.handleHelp(user);
    }
  }

  async handleStart(user) {

  }

  async handleHelp(user) {
    const text = await this.textHelper.getText('help', user);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }

  async handleAddChannel(user) {
    const text = await this.textHelper.getText('add_channel', user);

    this.userCache.setUserAction(user.id, 'channel');
    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }

  async handleCode(user) {
    const text = await this.textHelper.getText('wait_code', user);

    this.userCache.setUserAction(user.id, 'code');
    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }

  async channelOperations(user, subAction) {
    const userChannels = await this.dbConnection('user_channels').where('user_id', '=', user.id);

    if (!userChannels || !userChannels.length) {
      const text = await this.textHelper.getText('no_channels_name', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    const userChannelNames = await this.userHelper.channelsList(userChannels);
    const optionsAsInlineKeyboard = this.telegramInteractor.generateOptions(userChannelNames, subAction);
    const text = await this.textHelper.getText(subAction, user);

    await this.telegramInteractor.sendMessageWithOptions(user, optionsAsInlineKeyboard, text);
  }

  async handleListChannels(user) {
    const userChannels = await this.dbConnection('user_channels as uc')
        .where('uc.user_id', '=', user.id)
        .leftJoin('channels as c', 'uc.channel_id', '=', 'c.id')
        .select('c.chat as channel_name');

    if (!userChannels || !userChannels.length) {
      const text = await this.textHelper.getText('no_channels_name', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    const text = await this.textHelper.getText('channels_list', user);
    const channelsRow = userChannels.map(channel => channel.channel_name).join(',\n');

    const formattedText = `${text}\n${channelsRow}`;

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', formattedText, 'text');
  }
}
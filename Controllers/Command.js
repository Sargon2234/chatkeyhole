const CHANGE_NAME_ACTION = 'change_name';

export class CommandController {
  constructor(dbConnection, TextHelper, TelegramInteractor, UserHelper, UserCache) {
    this.dbConnection = dbConnection;
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
    this.userHelper = UserHelper;
    this.userCache = UserCache;
    this.availableCommands = [
      '/start',
      '/useCode',
      '/changeChatName',
      '/registerChannel',
      '/help',
    ];
  }

  async handleReceivedCommand(command, user) {
    if (!this.availableCommands.includes(command)) {
      return false;
    }

    switch (command) {
      case '/start':
        return this.handleStart(user);
      case '/useCode':
        return this.handleCode(user);
      case '/changeChatName':
        return this.channelOperations(user, CHANGE_NAME_ACTION);
      case '/registerChannel':
        return this.handleAddChannel(user);
      default:
        return this.handleHelp(user);
    }
  }

  async handleStart(user) {
    const text = await this.textHelper.getText('help', user);

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
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
}
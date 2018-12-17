export class CallbackController {
  constructor(dbConnection, TextHelper, TelegramInteractor, UserHelper, UserCache) {
    this.dbConnection = dbConnection;
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
    this.userHelper = UserHelper;
    this.userCache = UserCache;
  }

  async handleCallback(callbackData, user) {
    const [prefix, action] = callbackData.split(':');

    switch (prefix) {
      case 'change_name':
        return this.handleChangeName(action, user);
      case 'add_user':
        return this.handleAddUser(action, user);
      case 'send_message':
        return this.handleSendMessage(action, user);
    }
  }

  async handleChangeName(channel, user) {

  }

  async handleAddUser(channel, user) {

  }

  async handleSendMessage(channel, user) {

  }
}
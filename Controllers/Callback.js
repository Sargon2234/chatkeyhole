import { LocalCache as UserCache } from '../Helpers/UserCache';

export class CallbackController {
  constructor(TextHelper, TelegramInteractor) {
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
    this.userCache = UserCache;
  }

  async handleCallback(callbackData, user) {
    const [prefix, action] = callbackData.split(':');

    switch (prefix) {
      case 'skip':
        return this.handleSkip(user);
      case 'code2':
        return this.bindCodeAndChannel(user, action);
      case 'vote':
        return this.processVote(user, action);
    }
  }

  async handleSkip(user) {
    const text = await this.textHelper.getText('skip_action', user);

    const skipMessage = this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
    const removeLatestReplyMarkup = this.userCache.removeCacheForUser(user.id);
    const removeSelectedChannel = this.userCache.removeSelectedChannel(user.id);

    await Promise.all([
      skipMessage,
      removeLatestReplyMarkup,
      removeSelectedChannel,
    ]);
  }

  async bindCodeAndChannel(user, channelName) {
    await this.userCache.setUserSelectedChannel(user.id, channelName);

    const text = await this.textHelper.getText('wait_code', user);

    this.userCache.setUserAction(user.id, 'code');

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
  }

  async processVote(userData, action) {
    console.log('U', userData, 'action', action);
  }
}
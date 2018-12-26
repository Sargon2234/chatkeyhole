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
    }
  }

  async handleSkip(user) {
    const text = await this.textHelper.getText('skip_action', user);

    const skipMessage = this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
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

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text', process.env.BOT_PUBLISHER_TOKEN);
  }


  async sendTextWithSkip(user, skipText, formattedText) {
    const textInline = {
      inline_keyboard: [
        [
          {
            text: skipText,
            callback_data: 'skip:skip',
          },
        ],
      ],
    };

    const inUriString = encodeURI(JSON.stringify(textInline));

    const inlinePart = `reply_markup=${inUriString}`;

    await this.telegramInteractor.sendMessageWithOptions(user, inlinePart, formattedText, process.env.BOT_PUBLISHER_TOKEN);
  }
}
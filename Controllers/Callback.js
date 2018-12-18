import * as uuid from 'uuid/v1';

export class CallbackController {
  constructor(dbConnection, TextHelper, TelegramInteractor, UserCache, AuthorizationHelper) {
    this.dbConnection = dbConnection;
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
    this.userCache = UserCache;
    this.authorizationHelper = AuthorizationHelper;
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
      case 'skip':
        return this.handleSkip(user);
    }
  }

  async handleChangeName(channel, user) {
    const verifiedUserAndChannel = await this.authorizationHelper.verifyUserAndChannel(channel, user);

    if (!verifiedUserAndChannel) {
      return;
    }

    const verifiedUser = verifiedUserAndChannel.user;

    const [text, skipOption] = await Promise.all([
      this.textHelper.getText('name_in_channel', user),
      this.textHelper.getText('skip', user),
      this.userCache.setUserAction(user.id, 'changeName'),
      this.userCache.setUserSelectedChannel(user.id, channel),
    ]);

    const formattedText = text
        .replace('_channel_name_', channel)
        .replace('_user_name_', verifiedUser.channel_name);

    await this.sendTextWithSkip(user, skipOption, formattedText);
  }

  async handleAddUser(channel, user) {
    const verifiedUserAndChannel = await this.authorizationHelper.verifyUserAndChannel(channel, user);

    if (!verifiedUserAndChannel) {
      return;
    }

    const verifiedChannel = verifiedUserAndChannel.channel;

    const text = await this.textHelper.getText('add_user_code', user);
    const formattedText = text.replace('_channel_name_', channel);
    const code = uuid().slice(0, 6);

    const registerInvitationCodeInDb = this.dbConnection('user_invitations').insert(
        {
          invitation_code: code,
          inviter_user_id: user.id,
          channel_id: verifiedChannel.id,
          status: 'created',
        },
    );

    const textMessage = this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', formattedText, 'text');

    await Promise.all([
      registerInvitationCodeInDb,
      textMessage,
    ]);

    await new Promise(resolve => setTimeout(resolve, 300));

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', code, 'text');
  }

  async handleSendMessage(channel, user) {
    const verifiedUserAndChannel = await this.authorizationHelper.verifyUserAndChannel(channel, user);

    if (!verifiedUserAndChannel) {
      return;
    }

    const [text, skipText] = await Promise.all([
      this.textHelper.getText('send_message_text', user),
      this.textHelper.getText('skip', user),
      this.userCache.setUserSelectedChannel(user.id, channel),
    ]);

    const formattedText = text.replace('_channel_name_', channel);

    const sendTextMessage = this.sendTextWithSkip(user, skipText, formattedText);
    const setUserAction = this.userCache.setUserAction(user.id, 'sendMessage');

    await Promise.all([
      sendTextMessage,
      setUserAction,
    ]);
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

    await this.telegramInteractor.sendMessageWithOptions(user, inlinePart, formattedText);
  }
}
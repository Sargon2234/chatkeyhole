import { promisify } from '../src/Promisify';
import { LocalCache as UserCache } from './UserCache';

export class ChannelHelper {
  constructor(dbConnection, TextHelper, TelegramInteractor, AuthorizationHelper) {
    this.dbConnection = dbConnection;
    this.textHelper = TextHelper;
    this.telegramInteractor = TelegramInteractor;
    this.autorizationHelper = AuthorizationHelper;
    this.userCache = UserCache;
  }

  async addNewChannel(user, dataToProcess) {
    const channelName = dataToProcess.data = dataToProcess.data.includes('@') ? dataToProcess.data : `@${dataToProcess.data}`;

    const alreadyHaveThisChannel = await this.dbConnection('channels')
        .where('chat', '=', channelName)
        .select('id');

    // Somebody already registered this channel
    if (alreadyHaveThisChannel.length) {
      const text = await this.textHelper.getText('already_have', user);

      await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', text, 'text');
      return;
    }

    let textToRespondWith = '';

    const trx = await promisify(this.dbConnection.transaction);

    //  Here we add user to channel, and set invitation code as used.
    try {
      const newChannel = await trx('channels').insert({ chat: channelName }).returning('id');

      if (!newChannel || !newChannel.length) {
        throw new Error('Can not create channel');
      }

      await trx('user_channels')
          .insert({
            user_id: user.id,
            channel_id: newChannel[0],
            name: user.user_name,
          });

      await trx.commit();

      const textPart = await this.textHelper.getText('channel_added', user);
      textToRespondWith = textPart.replace('_channel_name_', channelName);
    } catch (e) {
      await trx.rollback();
      textToRespondWith = await this.textHelper.getText('error', user);
    }

    await this.telegramInteractor.sendMessage(user.chat_id, 'sendMessage', textToRespondWith, 'text');
  }
}
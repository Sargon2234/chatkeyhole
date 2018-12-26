export class UserHelper {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
  }

  async getUserData(userData, tgUserId, chatId) {
    let userDataInDb = await this.dbConnection('users')
        .where('tg_user_id', '=', tgUserId)
        .select('id', 'language', 'tg_user_id', 'user_name');

    if (!userDataInDb || !userDataInDb.length) {
      userData.language = userData.language_code || null;
      userData.user_name = userData.username;
      userData.tg_user_id = tgUserId;

      const { language_code, id, is_bot, username, ...userDataForDb } = userData;

      userDataInDb = await this.dbConnection('users')
          .insert(userDataForDb)
          .returning('id', 'language', 'tg_user_id', 'user_name');
    }

    return {
      id: userDataInDb[0].id,
      language: userDataInDb[0].language,
      tg_user_id: tgUserId,
      user_name: userDataInDb[0].user_name,
      chat_id: chatId,
    };
  }

  async channelsList(userChannels) {
    const channelsToSelect = userChannels.map(channel => channel.channel_id);
    const channels = await this.dbConnection('channels').whereIn('id', channelsToSelect).select('chat');

    if (!channels.length) {
      return false;
    }

    return channels.map(channel => channel.chat);
  }
}
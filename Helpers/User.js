export class UserHelper {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
  }

  async getUserData(userData, chatId) {
    let userDataInDb = await this.dbConnection('users')
        .where('chat_id', '=', chatId)
        .select('id', 'language', 'chat_id', 'user_name');

    if (!userDataInDb || !userDataInDb.length) {
      userData.language = userData.language_code || null;
      userData.user_name = userData.username;
      userData.chat_id = chatId;

      const { language_code, id, is_bot, username, ...userDataForDb } = userData;

      userDataInDb = await this.dbConnection('users')
          .insert(userDataForDb)
          .returning('id', 'language', 'chat_id', 'user_name');
    }

    return {
      id: userDataInDb[0].id,
      language: userDataInDb[0].language,
      chat_id: userDataInDb[0].chat_id,
      user_name: userDataInDb[0].user_name,
    };
  }

  async channelsList(userChannels) {
    const channelsToSelect = userChannels.map(channel => channel.channel_id);
    const channels = await this.dbConnection('channels').whereIn('id', channelsToSelect).select('chat');

    if (!channels || !channels.length) {
      return false;
    }

    return channels.map(channel => channel.chat);
  }
}
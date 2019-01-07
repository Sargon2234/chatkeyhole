export class GroupModel {
  constructor(db) {
    this.dbConnection = db;
  }

  async getChatsForGroup({ chat_id }) {
    return this.dbConnection('groups as g')
        .where('g.chat_id', '=', chat_id)
        .leftJoin('groups_with_channels as gwc', 'g.id', '=', 'gwc.group_id')
        .leftJoin('channels as c', 'gwc.channel_id', '=', 'c.id')
        .select('c.chat');
  }
}
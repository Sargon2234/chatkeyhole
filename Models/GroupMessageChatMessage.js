export class GroupMessageChatMessage {
  constructor(db) {
    this.dbConnection = db;
  }

  async getChatMessageId({ group_chat_id, group_message_id }, { chat }) {
    return this.dbConnection('group_message_chat_message')
        .where('group_chat_id', '=', group_chat_id)
        .where('channel', '=', chat)
        .where('group_message_id', '=', group_message_id)
        .select('chat_message_id');
  }
}
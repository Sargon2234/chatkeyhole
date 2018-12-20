import { BotEventEmitter } from '../Helpers/BotEventEmitter';

export class ListenBotController {
  constructor(db) {
    this.dbConnection = db;
    this.ee = BotEventEmitter;
  }

  async processIncomingRequest({ body }) {
    console.log('Listener');

    console.time('Process message took');
    try {
      await this.processData(body);
    } catch (e) {
      console.log('Listener error', e.message);
    } finally {
      console.timeEnd('Process message took');
    }
  }

  async processData({ message }) {
    const chatData = this.parseChatData(message);
    const messageData = this.parseMessageData(message, chatData);

    console.log('Msg data', messageData);

    if (message.left_chat_member) {
      console.log('User left chat');
      return;
    }

    if (message.new_chat_member) {
      console.log('User joined chat');
      return;
    }

    if (messageData.chat_id < 0) {
      return this.processGroupMessage(messageData);
    }

    return this.processInBotMessage(messageData);
  }

  async processGroupMessage(messageData) {
    this.ee.emit('group_message', JSON.stringify(messageData));
  }

  async processInBotMessage({ id, is_bot, chat_id, data, data_type }) {

  }

  parseChatData({ chat, entities }) {
    const { id, title, type } = chat;

    const returnData = { chat_id: id, title, type };

    if (entities) {
      returnData.data_type = entities[0].type;
    }

    return returnData;
  }

  parseMessageData(message, { chat_id, data_type }) {
    const { id, is_bot } = message.from;
    let data;
    let dataType;

    if (message.text) {
      console.log('Received text', message.text);
      data = message.text;
      dataType = 'text';
    }

    if (message.photo) {
      console.log('Received photo', message.photo);
      data = message.photo;
      dataType = 'photo';
    }

    if (message.document) {
      console.log('Received file', message.document);
      data = message.document;
      dataType = 'document';
    }

    if (data_type) {
      dataType = data_type;
    }

    console.log('In chat:', chat_id, 'from', id, 'it is bot', is_bot);

    return {
      id,
      is_bot,
      chat_id,
      data,
      data_type: dataType,
    };
  }
}
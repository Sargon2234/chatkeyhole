import { BotEventEmitter } from '../Helpers/BotEventEmitter';
import { AuthorizationHelper } from '../Helpers/Authorization';
import { listenBotCommands } from '../src/listenBotCommands';
import { CommandController } from './Command';
import { TextHelper } from '../Helpers/Text';
import { TelegramInteractor } from '../Helpers/TelegramInteractor';

export class ListenBotController {
  constructor(db) {
    this.ee = BotEventEmitter;
    this.textHelper = new TextHelper(db);
    this.telegramInteractor = new TelegramInteractor();
    this.authorization = new AuthorizationHelper(db, this.textHelper, this.telegramInteractor);
    this.commandController = new CommandController(db, listenBotCommands);
  }

  async processIncomingRequest({ body }) {
    console.log('Listener');

    if (body.inline_query) {
      console.log('Received strange', JSON.stringify(body.inline_query));
      return;
    }

    console.log('B', JSON.stringify(body));

    const user = await this.authorization.getUser(body);

    if (!user) {
      console.log('Some error in user', user);
      return;
    }

    console.log('U', user);

    console.time('Process message took');
    try {
      await this.processData(body, user);
    } catch (e) {
      console.log('Listener error', e.message);
    } finally {
      console.timeEnd('Process message took');
    }
  }

  async processData({ message }, user) {
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
      messageData.chat_id = message.chat.id;
      return this.processGroupMessage(messageData);
    }

    return this.processInBotMessage(messageData, user);
  }

  async processGroupMessage(messageData) {
    if (messageData.data_type === 'bot_command') {
      const user = {
        chat_id: messageData.chat_id,
      };

      await this.commandController.handleReceivedCommand(messageData.data, user, process.env.BOT_WATCHER_TOKEN);

      return;
    }

    this.ee.emit('group_message', JSON.stringify(messageData));
  }

  async processInBotMessage({ id, is_bot, chat_id, data, data_type }, user) {
    console.log('In bot message');

    user.chat_id = chat_id;

    switch (data_type) {
      case 'bot_command':
        await this.commandController.handleReceivedCommand(data, user, process.env.BOT_WATCHER_TOKEN);
        break;
    }
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
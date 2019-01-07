import { makeRequest } from './Request';
import { LocalCache as UserCache } from './UserCache';

export class TelegramInteractor {
  constructor() {
    this.userCache = UserCache;
  }

  async sendMessage(chatId, actionName, data, type, additional_data) {
    let dataForMessageSave;
    let row;

    if (additional_data) {
      let { group_chat_id, group_message_id } = additional_data;
      dataForMessageSave = { group_chat_id, group_message_id };
    }

    if (additional_data && additional_data.type && type !== 'forward_message') {
      row = `chat_id=${chatId}&${type}=${data}&${additional_data.type}=${additional_data.text}`;

      if (additional_data.reply_to_message_id) {
        row = `${row}&reply_to_message_id=${additional_data.reply_to_message_id}`;
      }
    }

    if (!row) {
      if (additional_data) {
        row = this.generateUrlString(chatId, data, type, additional_data.reply_to_message_id);
      } else {
        row = this.generateUrlString(chatId, data, type);
      }
    }

    return makeRequest(actionName, row, dataForMessageSave);
  }

  async sendPreparedMessage(preparedUrl) {
    return makeRequest('sendMessage', preparedUrl);
  }

  async sendMessageWithOptions(user, optionsAsInlineKeyboard, text) {
    const preparedText = this.generateUrlString(user.chat_id, text, 'text');

    const urlReady = `${preparedText}&${optionsAsInlineKeyboard}`;

    const messageData = await this.sendPreparedMessage(urlReady);

    if (messageData.ok) {
      const messageId = messageData.result.message_id;
      console.log('MID', messageId);

      this.userCache.setMessageCache(user.id, messageId);
    }
  }

  generateUrlString(chatId, data, type, replyMessageId) {
    let basePart = '';

    if (replyMessageId) {
      basePart = `reply_to_message_id=${replyMessageId}&`;
    }

    switch (type) {
      case 'text':
        data = encodeURIComponent(data);
        return `${basePart}chat_id=${chatId}&text=${data}`;
      case 'options':
        return `chat_id=${chatId}&${Object.entries(data).map(v => v.join('=')).join('&')}`;
      case 'video':
      case 'photo':
      case 'document':
      case 'video_note':
        return `${basePart}chat_id=${chatId}&${type}=${data}`;
      case 'forward_message':
        return `${basePart}chat_id=${chatId}&from_chat_id=${data.from_chat_id}&message_id=${data.message_id}`;
    }
  }

  getChatData(chatId) {
    return makeRequest('getChat', `chat_id=${chatId}`);
  }

  generateOptions(optionsList, optionsPrefix) {
    const preparedOptions = optionsList.map(option => ([{
      text: option,
      callback_data: `${optionsPrefix}:${option}`,
    }]));

    const inlineKeyboard = {
      inline_keyboard: preparedOptions,
    };

    const inUriString = encodeURIComponent(JSON.stringify(inlineKeyboard));

    return `reply_markup=${inUriString}`;
  }
}
import { makeRequest } from './Request';
import { LocalCache as UserCache } from './UserCache';

export class TelegramInteractor {
  constructor() {
    this.userCache = UserCache;
  }

  async sendMessage(chatId, actionName, data, type, additional_data) {
    if (additional_data && type !== 'forward_message') {
      const row = `chat_id=${chatId}&${type}=${data}&${additional_data.type}=${additional_data.text}`;

      return makeRequest(actionName, row);
    }

    return makeRequest(actionName, this.generateUrlString(chatId, data, type));
  }

  async sendPreparedMessage(preparedUrl) {
    return makeRequest('sendMessage', preparedUrl);
  }

  async sendMessageWithOptions(user, optionsAsInlineKeyboard, text) {
    const preparedText = await this.generateUrlString(user.chat_id, text, 'text');

    const urlReady = `${preparedText}&${optionsAsInlineKeyboard}`;

    const messageData = await this.sendPreparedMessage(urlReady);

    if (messageData.ok) {
      const messageId = messageData.result.message_id;
      console.log('MID', messageId);

      this.userCache.setMessageCache(user.id, messageId);
    }
  }

  generateUrlString(chatId, data, type) {
    switch (type) {
      case 'text':
        data = encodeURIComponent(data);
        return `chat_id=${chatId}&text=${data}`;
      case 'options':
        return `chat_id=${chatId}&${Object.entries(data).map(v => v.join('=')).join('&')}`;
      case 'video':
      case 'photo':
      case 'document':
        return `chat_id=${chatId}&${type}=${data}`;
      case 'forward_message':
        return `chat_id=${chatId}&from_chat_id=${data.from_chat_id}&message_id=${data.message_id}`;
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
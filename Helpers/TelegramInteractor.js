import { makeRequest } from './Request';
import { LocalCache as UserCache } from './UserCache';

export class TelegramInteractor {
  constructor() {
    this.userCache = UserCache;
  }

  async sendMessage(chatId, actionName, data, type, token) {
    return makeRequest(actionName, this.generateUrlString(chatId, data, type), token);
  }

  async sendPreparedMessage(preparedUrl, token) {
    return makeRequest('sendMessage', preparedUrl, token);
  }

  async sendMessageWithOptions(user, optionsAsInlineKeyboard, text, token) {
    const preparedText = await this.generateUrlString(user.chat_id, text, 'text');

    const urlReady = `${preparedText}&${optionsAsInlineKeyboard}`;

    const messageData = await this.sendPreparedMessage(urlReady, token);

    if (messageData.ok) {
      const messageId = messageData.result.message_id;
      console.log('MID', messageId);

      this.userCache.setMessageCache(user.id, messageId);
    }
  }

  generateUrlString(chatId, data, type) {
    switch (type) {
      case 'text':
        data = encodeURI(data);
        return `chat_id=${chatId}&text=${data}`;
      case 'image':
        return `chat_id=${chatId}&photo=${data}`;
      case 'options':
        return `chat_id=${chatId}&${Object.entries(data).map(v => v.join('=')).join('&')}`;
    }
  }

  getChatData(chatId, token) {
    return makeRequest('getChat', `chat_id=${chatId}`, token);
  }

  generateOptions(optionsList, optionsPrefix) {
    const preparedOptions = optionsList.map(option => ([{
      text: option,
      callback_data: `${optionsPrefix}:${option}`,
    }]));

    const inlineKeyboard = {
      inline_keyboard: preparedOptions,
    };

    const inUriString = encodeURI(JSON.stringify(inlineKeyboard));

    return `reply_markup=${inUriString}`;
  }
}
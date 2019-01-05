import { makeRequest } from './Request';
import { LocalCache as UserCache } from './UserCache';

export class TelegramInteractor {
  constructor() {
    this.userCache = UserCache;
  }

  async sendMessage(chatId, actionName, data, type, additional_data) {
    if (additional_data) {
      const row = `chat_id=${chatId}&photo=${data}&${additional_data.type}=${additional_data.text}`;

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
        data = encodeURI(data);
        return `chat_id=${chatId}&text=${data}`;
      case 'photo':
        return `chat_id=${chatId}&photo=${data}`;
      case 'options':
        return `chat_id=${chatId}&${Object.entries(data).map(v => v.join('=')).join('&')}`;
    }

    // case 'document':
    // case 'video':
    //  case 'audio':
    // case 'voice':
    // case 'video_note':
    // case 'location'
    // case 'contact'
    // case 'animation':
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

    const inUriString = encodeURI(JSON.stringify(inlineKeyboard));

    return `reply_markup=${inUriString}`;
  }
}
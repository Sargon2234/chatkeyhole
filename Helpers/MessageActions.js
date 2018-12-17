import { makeRequest } from './Request';
import { Channel } from '../Models/Channel';

export class MessageActions {
  constructor(databaseConnection, textHelper, channelConnection) {
    this.textHelper = textHelper;
    this.channelConnection = channelConnection;
    this.channelModel = new Channel(databaseConnection, this.channelConnection);
  }

  async sendMessage(chatId, actionName, options) {
    return makeRequest(actionName, this.generateUrlString(chatId, options, 'options'));
  }

  async sendTextMessage(chatId, text) {
    if (!text) {
      return;
    }

    return makeRequest('sendMessage', this.generateUrlString(chatId, text, 'text'));
  }

  async finalText(chatId, text, { language }, { city }) {
    //  We get current city to find channel name.
    if (city) {
      const cityChannel = await this.channelModel.getChannelForCity(city);

      if (cityChannel) {
        const replacedText = text.replace(/channel_name/g, cityChannel.channel_id);
        return this.sendTextWithOptions(chatId, replacedText, 'final', language);
      }
    }

    return this.sendTextWithOptions(chatId, text, 'final', language);
  }

  async sendTextWithOptions(chatId, text, option, language) {
    if (!text) {
      return;
    }

    if (!language) {
      language = 'ua';
    }

    const optionsPart = await this.getOptionsByType(option, language);
    const textPart = this.generateUrlString(chatId, text, 'text');

    const urlReady = `${textPart}&${optionsPart}`;

    const messageData = await makeRequest('sendMessage', urlReady);

    if (messageData.ok) {
      const messageId = messageData.result.message_id;

      await this.textHelper.setLatestOptionsMessage({ chatId, messageId });
    }

    return messageData;
  }

  async sendPhoto(chatId, fileId) {
    const sendResult = await makeRequest('sendPhoto', this.generateUrlString(chatId, fileId, 'image'));
    console.log('SR2', sendResult);
    return sendResult;
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

  async getOptionsByType(type, language) {
    const options = await this.optionsByType(type, language);

    const inUriString = encodeURI(JSON.stringify(options));

    return `reply_markup=${inUriString}`;
  }

  optionsByType(type, language) {
    switch (type) {
      case 'language':
        return {
          inline_keyboard: [
            [
              {
                text: '🇺🇦 Українська',
                callback_data: 'lang:ua',
              },
              {
                text: '🇷🇺 Русский',
                callback_data: 'lang:ru',
              },
            ],
          ],
        };
      case 'city':
        return this.defineOptionsByLanguage(language);
      case 'skip':
        return this.defineSkipForLanguage(language);
      case 'final':
        return this.defineFinalForLanguage(language);
      case 'done':
        return {
          inline_keyboard: [
            [
              {
                text: this.getAgainText(language, 'start_over'),
                callback_data: 'start:over',
              },
            ],
          ],
        };
      case 'again':
        return {
          inline_keyboard: [
            [
              {
                text: this.getAgainText(language, 'again'),
                callback_data: 'start:over',
              },
            ],
          ],
        };
    }
  }

  defineOptionsByLanguage(language) {
    switch (language) {
      case 'ru':
        return {
          inline_keyboard: [
            [
              {
                text: '🔥 Киев',
                callback_data: 'city:kyiv',
              },
              {
                text: '❤ Одесса',
                callback_data: 'city:odessa',
              },
            ],
            [
              {
                text: '️⭐ Харьков',
                callback_data: 'city:kharkov',
              },
              {
                text: '🏅 Львов',
                callback_data: 'city:lviv',
              },
            ],
            [
              {
                text: '💎 Днепр',
                callback_data: 'city:dnipro',
              },
            ],
            [
              {
                text: this.getAgainText(language, 'again'),
                callback_data: 'start:over',
              },
            ],
          ],
        };
      case 'ua':
        return {
          inline_keyboard: [
            [
              {
                text: '🔥 Київ',
                callback_data: 'city:kyiv',
              },
              {
                text: '❤ Одеса',
                callback_data: 'city:odessa',
              },
            ],
            [
              {
                text: '️⭐ Харків',
                callback_data: 'city:kharkov',
              },
              {
                text: '🏅 Львів',
                callback_data: 'city:lviv',
              },
            ],
            [
              {
                text: '💎 Дніпро',
                callback_data: 'city:dnipro',
              },
            ],
            [
              {
                text: this.getAgainText(language, 'again'),
                callback_data: 'start:over',
              },
            ],
          ],
        };
    }
  }

  defineSkipForLanguage(language) {
    let text = 'Пропустить ➡️';

    if (language === 'ua') {
      text = 'Далі ➡️';
    }

    return {
      inline_keyboard: [
        [
          {
            text,
            callback_data: 'action:skip',
          },
        ],
        [
          {
            text: this.getAgainText(language, 'again'),
            callback_data: 'start:over',
          },
        ],
      ],
    };
  }

  async defineFinalForLanguage(language) {
    const [anonText, doneText] = await Promise.all([
      this.textHelper.getText('anon', language),
      this.textHelper.getText('to_done', language),
    ]);

    return {
      inline_keyboard: [
        [
          {
            text: anonText,
            callback_data: 'action:anon',
          },
          {
            text: doneText,
            callback_data: 'action:done',
          },
        ],
        [
          {
            text: this.getAgainText(language, 'again'),
            callback_data: 'start:over',
          },
        ],
      ],
    };
  }

  getAgainText(language, reason) {
    return reason === 'again' ? `${language === 'ua' ? 'Почати спочатку' : 'Начать сначала'} 🔁` :
        `🤬 ${language === 'ua' ? 'Ще' : 'Еще'} ‼️`;
  }
}
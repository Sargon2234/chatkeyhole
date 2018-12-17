import { RedisHelper } from './Redis';

export class TextsHelper {
  constructor(mysqlConnection, redisTextsConnection) {
    this.mysqlConnection = mysqlConnection;
    this.redisTextsConnection = redisTextsConnection;
    this.redisHelper = new RedisHelper();
  }

  async getText(key, language) {
    if (!language) {
      language = 'ua';
    }

    const keyToSearch = `${language}:${key}`;
    const cachedText = await this.redisHelper.getByKey(this.redisTextsConnection, 'val', keyToSearch);

    if (cachedText) {
      return cachedText;
    }

    const textDataInDb = await this.mysqlConnection('texts')
        .where('key', '=', key)
        .where('language', '=', language)
        .select('value');

    if (textDataInDb && textDataInDb.length) {
      if (textDataInDb[0].value) {
        await this.redisHelper.setKey(this.redisTextsConnection, keyToSearch, textDataInDb[0].value);

        return textDataInDb[0].value;
      }
    }
  }

  async setLatestOptionsMessage({ chatId, messageId }) {
    const cacheKey = `${chatId}:message:options`;
    await this.redisHelper.setKey(this.redisTextsConnection, cacheKey, messageId);
  }

  async getLatestOptionsMessage(chatId) {
    const cacheKey = `${chatId}:message:options`;
    return this.redisHelper.getByKey(this.redisTextsConnection, 'val', cacheKey);
  }
}
import { availableLanguagesCodes } from '../src/availableLanguages';

export class TextHelper {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
  }

  async getText(key, { language }) {
    if (!language || !availableLanguagesCodes.includes(language)) {
      language = 'en';
    }

    const foundText = await this.dbConnection('texts')
        .select('text')
        .where('key', '=', key)
        .where('language', '=', language);

    return foundText[0].text;
  }
}
import { MessageParser } from '../Helpers/MessageParser';

export class MainController {
  constructor(databaseConnection) {
    this.messageParser = new MessageParser();
  }

  async processIncomingRequest({ body }) {
    if (body.inline_query) {
      console.log('Received strange', JSON.stringify(body.inline_query));
      return;
    }

    const dataToProcess = await this.messageParser.parseMessage(body);

    console.log('DTP', dataToProcess);
    if (!dataToProcess) {
      return false;
    }

    // const userData = await this.userHelper.getUser(dataToProcess.chat_id, dataToProcess);
    //
    // if (!userData) {
    //   return;
    // }
    //
    // if ('is_new' in userData || dataToProcess.data === '/start') {
    //   // If user is new, first of all we have to get his language.
    //   await this.messageActions.sendTextWithOptions(dataToProcess.chat_id, 'Оберiть мову / Выберите язык / Choose language 🇺🇦/🇷🇺/🇬🇧', 'language');
    //   return;
    // }
  }
}
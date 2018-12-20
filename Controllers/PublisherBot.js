export class PublisherBot {
  constructor(db) {
    this.dbConnection = db;
  }

  async publishMessageToDependentChannels(messageData) {
    const message = JSON.parse(messageData);

    console.log('In publisher', message);
  }
}
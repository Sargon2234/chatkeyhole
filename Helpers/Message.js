export class MessageHelper {
  constructor() {
  }

  parseMessageData(message, { chat_id, data_type }) {
    const { id, is_bot } = message.from;
    let data;
    let dataType;
    let additionalData = null;

    if (message.text) {
      console.log('Received text', message.text);
      data = message.text;
      dataType = 'text';
    }

    if (message.photo) {
      console.log('Received photo', JSON.stringify(message.photo));
      data = message.photo;

      if (message.caption) {
        additionalData = {
          type: 'caption',
          text: message.caption,
        };
      }
      dataType = 'photo';
    }

    if (message.document) {
      console.log('Received file', JSON.stringify(message.document));
      data = message.document;
      dataType = 'document';
    }

    if (message.reply_to_message) {
      additionalData = message.reply_to_message;
      console.log('This is reply', JSON.stringify(message.reply_to_message));
    }

    if (data_type) {
      dataType = data_type;
    }

    if (message.callback_query) {
      data = message.callback_query;
    }

    console.log('In chat:', chat_id, 'from', id, 'it is bot', is_bot);

    return {
      id,
      is_bot,
      chat_id,
      data,
      data_type: dataType,
      additional_data: additionalData,
    };
  }
}
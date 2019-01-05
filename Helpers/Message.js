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

    if (message.sticker) {
      data = message.sticker.file_id;
      dataType = 'sticker';
    }

    if (message.document) {
      console.log('Received file', JSON.stringify(message.document));
      dataType = 'document';

      if (message.document.mime_type && message.document.mime_type === 'video/mp4') {
        switch (message.document.mime_type) {
          case 'video/mp4':
            dataType = 'video';
            break;
        }
      }

      data = message.document.file_id;
    }

    if (message.reply_to_message) {
      console.log('This is reply', JSON.stringify(message.reply_to_message));
      const replyMessageId = message.reply_to_message.message_id;

      additionalData = {
        type: 'reply_to_message_id',
        text: replyMessageId,
      };
    }

    console.log('M', JSON.stringify(message));

    if (message.entities) {
      const formattedEntites = message.entities
          .filter(entity => entity.type === 'text_link')
          .map(entity => entity.url)
          .join('\n');

      console.log('Formateed', formattedEntites, dataType);

      // Append to text message all links.
      if (dataType === 'text') {
        data = `${data}\n${formattedEntites}`;
      }
    }

    if (data_type) {
      dataType = data_type;
    }

    if (message.callback_query) {
      data = message.callback_query;
    }

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
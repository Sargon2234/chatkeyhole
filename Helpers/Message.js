export class MessageHelper {
  constructor() {
  }

  parseMessageData(message, { chat_id, data_type }) {
    const { id, is_bot } = message.from;

    let { data, dataType, additionalData } = this.getMessageMainData(message);

    if (message.reply_to_message) {
      console.log('This is reply', JSON.stringify(message.reply_to_message));

      additionalData.reply_message = {
        group_chat_id: message.reply_to_message.chat.id,
        group_message_id: message.reply_to_message.message_id,
        message_to_save: this.parseMessageData(message.reply_to_message, { chat_id, data_type }),
      };
    }

    console.log('\nM', JSON.stringify(message));

    if (message.entities) {
      const formattedEntities = message.entities
          .filter(entity => entity.type === 'text_link')
          .map(entity => entity.url)
          .join('\n');

      console.log('Formatted', formattedEntities, dataType);

      // Append to text message all links.
      if (dataType === 'text') {
        data = `${data}\n${formattedEntities}`;
      }
    }

    if (dataType !== 'forward_message' && data_type) {
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
      date: message.date,
      message_id: message.message_id,
      data_type: dataType,
      additional_data: additionalData,
    };
  }

  getMessageMainData(message) {
    let data;
    let dataType;
    let additionalData = {
      group_message_id: message.message_id,
      group_chat_id: message.chat.id,
    };

    // Check if we have some caption for message
    if (message.caption) {
      additionalData = {
        type: 'caption',
        text: message.caption,
      };
    }

    if (message.forward_from_chat) {
      console.log('\nThis is forwarded message', JSON.stringify(message));

      data = {
        chat_id: message.chat.id,
        from_chat_id: message.chat.id,
        message_id: message.message_id,
      };

      return { data, dataType: 'forward_message', additionalData };
    }

    if (message.text) {
      dataType = 'text';
    }

    if (message.photo) {
      dataType = 'photo';
    }

    if (message.sticker) {
      dataType = 'sticker';
    }

    if (message.document) {
      dataType = 'document';
    }

    if (message.voice) {
      dataType = 'voice';
    }

    if (message.audio) {
      dataType = 'audio';
    }

    if (message.video_note) {
      dataType = 'video_note';
    }

    if (message.text || message.photo) {
      data = message[dataType];
    } else {
      data = message[dataType].file_id;
    }

    return { data, dataType, additionalData };
  }
}
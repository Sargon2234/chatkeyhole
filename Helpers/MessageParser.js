export class MessageParser {
  constructor() {

  }

  parseMessage(message) {
    const messageType = this.defineMessageType(message);
    const usefulPart = messageType === 'callback_query' ? message[messageType] : message.message;

    // If this is bot message we can ignore.
    if (usefulPart.from.is_bot) {
      return false;
    }

    const parsedMessage = {
      type: messageType,
      time: message.update_id,
      chat_id: usefulPart.from.id,
      user_name: usefulPart.from.username,
      first_name: usefulPart.from.first_name,
      last_name: usefulPart.from.last_name,
    };

    parsedMessage.data = messageType === 'callback_query' ? usefulPart.data : usefulPart[messageType];

    console.log(usefulPart);

    switch (messageType) {
      case 'callback_query':
        parsedMessage.data = usefulPart.data;
        break;
      case 'text':
        parsedMessage.data = usefulPart[messageType];
        break;
      case 'photo':
        parsedMessage.data = usefulPart[messageType][usefulPart[messageType].length - 1].file_id;
        break;
      default:
        return false;
    }

    return parsedMessage;
  }

  defineMessageType(message) {
    if ('callback_query' in message) {
      return 'callback_query';
    }

    if ('message' in message) {
      if ('text' in message.message) {
        return 'text';
      }

      if ('photo' in message.message) {
        return 'photo';
      }
    }

    return false;
  }
}
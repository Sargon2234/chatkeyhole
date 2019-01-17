import { messageTypesWithActions } from '../src/messageTypesWithActions';
import { TelegramInteractor } from './TelegramInteractor';

const CAPTION_NEEDED = ['photo', 'video', 'document', 'audio', 'voice'];
const NEED_PREVIOUS_MESSAGE = ['sticker', 'video_note', 'forward_message'];

const telegramInteractor = new TelegramInteractor();

const messageBroadcast = async (UserModel, chatIdPublishMessageTo, message) => {
  const userNameForMessage = await UserModel.getUserByTgId(message);
  const textToSendBeforeData = userNameForMessage[0].user_name;

  // Set data for message save (Needed for future message reply)
  if (!message.additional_data) {
    message.additional_data = {
      group_chat_id: message.chat_id,
      group_message_id: message.message_id,
    };
  }

  if (!message.additional_data.group_chat_id) {
    message.additional_data.group_chat_id = message.chat_id;
    message.additional_data.group_message_id = message.message_id;
  }

  // Define do we need to add caption for message.
  if (CAPTION_NEEDED.includes(message.data_type)) {
    // If message already have caption, we have to add user name before main text
    if (message.additional_data.type === 'caption') {
      message.additional_data.text = `${textToSendBeforeData}:\n${message.additional_data.text}`;
    } else {
      // If message doesn't have caption, but requires it, we have to add it.
      // In this case caption would be only user name.
      message.additional_data.type = 'caption';
      message.additional_data.text = textToSendBeforeData;
    }

    message.additional_data.text = encodeURIComponent(message.additional_data.text);
  }

  // Send message with user name to distinct who sent message to group. If we can't add caption.
  if (NEED_PREVIOUS_MESSAGE.includes(message.data_type)) {
    if (message.data_type === 'forward_message') {
      message.additional_data.type = null;
    }

    await telegramInteractor.sendMessage(chatIdPublishMessageTo, 'sendMessage', `${textToSendBeforeData}:`, 'text', message.additional_data);
  }

  // We have bunch of files or some other data
  if (Array.isArray(message.data)) {
    // Sort files from bigger size to lower
    const filteredData = message.data.sort((a, b) => b.size - a.size)[0];

    if (message.data_type === 'photo') {
      message.data = filteredData.file_id;
    }
  }

  if (messageTypesWithActions[message.data_type]) {
    return telegramInteractor.sendMessage(chatIdPublishMessageTo, messageTypesWithActions[message.data_type].action, message.data, messageTypesWithActions[message.data_type].type, message.additional_data);
  }

  const textToSend = `${userNameForMessage[0].user_name}:\n${message.data}`;

  return telegramInteractor.sendMessage(chatIdPublishMessageTo, 'sendMessage', textToSend, 'text', message.additional_data);
};

export { messageBroadcast };
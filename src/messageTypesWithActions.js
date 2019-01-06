export const messageTypesWithActions = {
  video: {
    action: 'sendDocument',
    type: 'document',
  },
  document: {
    action: 'sendDocument',
    type: 'document',
  },
  sticker: {
    action: 'sendDocument',
    type: 'document',
  },
  audio: {
    action: 'sendAudio',
    type: 'audio',
  },
  voice: {
    action: 'sendVoice',
    type: 'voice',
  },
  video_note: {
    action: 'sendVideoNote',
    type: 'video_note',
  },
  forward_message: {
    action: 'forwardMessage',
    type: 'forward_message',
  },
};
import EventEmitter from 'events';

class OwnEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
}

export const BotEventEmitter = new OwnEventEmitter();
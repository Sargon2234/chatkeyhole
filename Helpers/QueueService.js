class QueueService {
  constructor() {
    this.queue = {};
  }

  checkInQueue(keyToCheck) {
    return this.queue[keyToCheck];
  }

  setLock(keyToCheck, lockEnabled) {
    this.queue[keyToCheck] = lockEnabled;
    return true;
  }
}

export const Queue = new QueueService();
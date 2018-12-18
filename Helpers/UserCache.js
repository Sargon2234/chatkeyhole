export class UserCache {
  constructor() {
    this.userActions = {};
    this.messageCache = {};
    this.userSelectedChannel = {};
  }

  getUserById(userId) {
    return this.userActions[userId];
  }

  getUserCacheMessage(userId) {
    return this.messageCache[userId];
  }

  getUserSelectedChannel(userId) {
    return this.userSelectedChannel[userId];
  }

  setUserAction(userId, action) {
    this.userActions[userId] = action;
  }

  setMessageCache(userId, key) {
    this.messageCache[userId] = key;
  }

  setUserSelectedChannel(userId, channelName) {
    this.userSelectedChannel[userId] = channelName;
  }

  removeUserActionsCache(userId) {
    this.userActions[userId] = null;
  }

  removeCacheForUser(userId) {
    this.messageCache[userId] = null;
  }

  removeSelectedChannel(userId) {
    this.userSelectedChannel[userId] = null;
  }
}
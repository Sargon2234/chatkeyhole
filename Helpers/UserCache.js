export class UserCache {
  constructor() {
    this.userActions = {};
    this.messageCache = {};
  }

  getUserById(userId) {
    return this.userActions[userId];
  }

  getUserCacheMessage(userId) {
    return this.messageCache[userId];
  }

  setUserAction(userId, action) {
    this.userActions[userId] = action;
  }

  setMessageCache(userId, key) {
    this.messageCache[userId] = key;
  }

  removeCacheForUser(userId) {
    this.messageCache[userId] = null;
  }
}
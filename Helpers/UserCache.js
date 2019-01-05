class UserCache {
  constructor() {
    this.userActions = {};
    this.messageCache = {};
    this.userSelectedChannel = {};
  }

  getUserById(userId) {
    console.log('get cache for user', userId);

    return this.userActions[userId];
  }

  getUserCacheMessage(userId) {
    return this.messageCache[userId];
  }

  getUserSelectedChannel(userId) {
    return this.userSelectedChannel[userId];
  }

  setUserAction(userId, action) {
    console.log('set cache for user', userId, action);
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

export const LocalCache = new UserCache();
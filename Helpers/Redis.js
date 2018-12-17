export class RedisHelper {
  constructor() {
  }

  getByKey(connection, type = 'val', key) {
    return new Promise(resolve => {
      if (type === 'val') {
        connection.get(key, (err, res) => {
              if (err) {
                return resolve(false);
              }

              return resolve(res);
            },
        )
        ;
      }

      if (type === 'hash') {
        connection.hgetall(key, (err, res) => {
          if (err) return resolve(false);

          return resolve(res);
        });
      }
    });
  };

  setKey(connection, key, value) {
    if (!value) {
      return;
    }

    return new Promise(resolve => {
      connection.set(key, value, (err, res) => {
        if (err) return resolve(false);

        resolve(res);
      });
    });
  };

  deleteKey(connection, key) {
    return new Promise(resolve => {
      connection.del(key, (err, res) => {
        if (err) return resolve(false);

        resolve(res);
      });
    });
  };

  setHash(connection, hashKey, data) {
    return new Promise(resolve => {
      connection.hmset(hashKey, data, (err, res) => {
        if (err) return resolve(false);

        resolve(res);
      });
    });
  };

  updateHash(connection, hashId, keyToUpdate, valueToSet) {
    return new Promise(resolve => {
      connection.hset(hashId, keyToUpdate, valueToSet, (err, res) => {
        if (err) return resolve(false);

        resolve(res);
      });
    });
  };
}
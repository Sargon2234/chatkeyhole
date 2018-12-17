import redis from 'redis';
import { redisDbNamesWithNumber } from './src/redisDatabases';

export class RedisConnector {
  constructor() {
    this.connections = {};
  }

  getConnection(dbNum) {
    if (!this.connections[dbNum]) {
      this.connections[dbNum] = redis.createClient({
        host: 'tg-redis',
        port: process.env.REDIS_PORT,
        db: dbNum,
      });
    }

    this.connections[dbNum].on('error', (err) => {
      console.log(`Redis error ${err}`);
    });

    return this.connections[dbNum];
  }

  closeConnections() {
    for (const redisConnection of Object.values(this.connections)) {
      redisConnection.quit();
    }
  }

  closeConnection(connectionName) {
    if (this.connections[redisDbNamesWithNumber[connectionName]]) {
      this.connections[redisDbNamesWithNumber[connectionName]].quit();
    }
  }
}
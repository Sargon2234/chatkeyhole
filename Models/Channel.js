import { RedisHelper } from '../Helpers/Redis';

export class Channel {
  constructor(db, redisChannelConnection) {
    this.db = db;
    this.redisHelper = new RedisHelper();
    this.redisChannel = redisChannelConnection;
  }

  async getChannelForCity(city) {
    const cityDataFromCache = await this.redisHelper.getByKey(this.redisChannel, 'hash', city);

    if (!cityDataFromCache) {
      const cityDataFromDb = await this.db('bot_city_channels')
          .select('city_ru', 'city_ua', 'channel_id', 'channel_name', 'channel_link', 'channel_image')
          .where('city', '=', city);

      if (cityDataFromDb && cityDataFromDb.length) {
        await this.redisHelper.setHash(this.redisChannel, city, cityDataFromDb[0]);

        return cityDataFromDb[0];
      }

      return false;
    }

    return cityDataFromCache;
  }
}
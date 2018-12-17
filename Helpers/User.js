import { RedisHelper } from './Redis';

export class UserHelper {
  constructor(mysqlConnection, redisUserConnection, redisUserFlow, redisUserReport) {
    this.mysqlConnection = mysqlConnection;
    this.redisUserConnection = redisUserConnection;
    this.redisUserFlow = redisUserFlow;
    this.redisUserReport = redisUserReport;
    this.redisHelper = new RedisHelper();
  }

  async getUser(userChatId, userDataToInsert) {
    const cachedUserData = await this.redisHelper.getByKey(this.redisUserConnection, 'hash', userChatId.toString());

    if (cachedUserData) {
      return cachedUserData;
    }

    let userDataInDb = await this.mysqlConnection('users')
        .where('chat_id', '=', userChatId)
        .select('language', 'id');

    // Looks like there is no user to process. We have to create new one.
    if (!userDataInDb || !userDataInDb.length) {
      const createResult = await this.createUser(userDataToInsert);

      if (createResult && createResult.length) {
        userDataToInsert.user_id = createResult[0];
        await this.redisHelper.setHash(this.redisUserConnection, userChatId, userDataToInsert);

        userDataToInsert.is_new = true;

        return userDataToInsert;
      }

      return false;
    }

    userDataInDb = userDataInDb[0];

    userDataToInsert.user_id = userDataInDb.id;
    userDataToInsert.language = userDataInDb.language;

    await this.redisHelper.setHash(this.redisUserConnection, userChatId, userDataToInsert);

    return userDataToInsert;
  }

  createUser({ chat_id, user_name, first_name, last_name }) {
    chat_id = parseInt(chat_id, 10);

    return this.mysqlConnection('users')
        .returning(['id'])
        .insert({ chat_id, user_name, first_name, last_name });
  }

  async updateUser(chat_id, dataToUpdate) {
    await this.mysqlConnection('users').where({ chat_id: parseInt(chat_id) }).update(dataToUpdate);
  }

  async saveUserReport(chatId) {
    const userData = await this.getUser(chatId);
    const userReportData = await this.redisHelper.getByKey(this.redisUserReport, 'hash', chatId);

    if (!userData || !userReportData) {
      return;
    }

    const preparedDataToInsert = {
      user_id: parseInt(userData.user_id),
      city: userReportData.city,
      master_name: userReportData.master,
      comment: userReportData.description,
      anonymous: !!userReportData.anon,
      status: 'created',
    };

    const reportId = await this.mysqlConnection('user_reports').insert(preparedDataToInsert).returning('id');

    if (!reportId || !reportId.length) {
      console.log('Can not save report', JSON.stringify(preparedDataToInsert));
      return;
    }

    const images = userReportData.images ? JSON.parse(userReportData.images) : [];
    const links = userReportData.links ? userReportData.links.split(',') : [];

    const insertedReportId = reportId[0];

    const imagesToSave = [];
    const linksToSave = [];

    if (images && images.length) {
      for (const image of images) {
        imagesToSave.push({ report_id: insertedReportId, file_id: image });
      }
    }

    if (links && links.length) {
      for (const link of links) {
        linksToSave.push({ report_id: insertedReportId, link });
      }
    }

    await Promise.all([
      this.mysqlConnection('report_images').insert(imagesToSave),
      this.mysqlConnection('report_master_links').insert(linksToSave),
      this.redisHelper.setKey(this.redisUserFlow, chatId, 'master'),
      this.redisHelper.deleteKey(this.redisUserReport, chatId),
    ]);
  }
}
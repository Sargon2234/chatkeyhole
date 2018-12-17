export class UserModel {
  constructor(dbConnection) {
    this.dbConnection = dbConnection('user');
  }

  async findUser(userChatId) {

  }

  async createUser({ chat_id, user_name, first_name, last_name }) {

  }

  async updateUser({ chat_id }, key, value) {

  }
}
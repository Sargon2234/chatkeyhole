export class UserModel {
  constructor(db) {
    this.dbConnection = db;
  }

  async getUserByTgId({ id }) {
    return this.dbConnection('users')
        .where('tg_user_id', '=', id)
        .select('user_name');
  }

}
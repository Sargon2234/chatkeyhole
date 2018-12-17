exports.up = function (knex, Promise) {
  return knex.schema.createTable('users', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('chat_id').unsigned().notNull();
    t.string('user_name', 100).nullable();
    t.string('first_name', 50).nullable();
    t.string('last_name', 50).nullable();
    t.enu('language', ['en', 'ru', 'ua']).nullable();
    t.text('image').nullable();
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('users');
};

exports.up = function (knex, Promise) {
  return knex.schema.createTable('user_channels', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('user_id').unsigned().references('id').inTable('users');
    t.integer('channel_id').unsigned().references('id').inTable('channels');
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('user_channels');
};

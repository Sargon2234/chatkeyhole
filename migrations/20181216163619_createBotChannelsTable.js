exports.up = function (knex, Promise) {
  return knex.schema.createTable('channels', function (t) {
    t.increments('id').unsigned().primary();
    t.string('chat').notNull();
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('user_channels');
};

exports.up = function (knex, Promise) {
  return knex.schema.createTable('user_channels', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    t.integer('channel_id').unsigned().references('id').inTable('channels').onDelete('CASCADE');
    t.string('name', 100).notNull();
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.unique(['user_id', 'channel_id']);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('user_channels');
};

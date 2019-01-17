exports.up = function (knex, Promise) {
  return knex.schema.createTable('channel_message_results', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('channel_message_id').unsigned().notNull();
    t.integer('user_id').unsigned().references('id').inTable('users').nullable();
    t.integer('channel').unsigned().references('id').inTable('channels').nullable().onDelete('CASCADE');
    t.enu('status', ['like', 'dislike']);
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.unique(['user_id', 'channel', 'channel_message_id'], 'unique_reaction');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('channel_message_results');
};

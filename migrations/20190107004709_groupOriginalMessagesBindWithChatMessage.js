exports.up = function (knex, Promise) {
  return knex.schema.createTable('group_message_chat_message', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('group_chat_id').notNull();
    t.string('channel').notNull();
    t.integer('group_message_id').unsigned().notNull();
    t.integer('chat_message_id').unsigned().notNull();
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('group_message_chat_message');
};

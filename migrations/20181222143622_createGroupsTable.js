exports.up = function (knex, Promise) {
  return knex.schema.createTable('groups', function (t) {
    t.increments('id').unsigned().primary();
    t.string('group').notNull();
    t.string('chat_id').notNull();
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.unique('chat_id');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('groups');
};

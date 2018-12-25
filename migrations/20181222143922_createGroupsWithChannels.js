exports.up = function (knex, Promise) {
  return knex.schema.createTable('groups_with_channels', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('group_id').unsigned().references('id').inTable('groups');
    t.integer('channel_id').unsigned().references('id').inTable('channels');
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.unique(['group_id', 'channel_id']);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('groups_with_channels');
};

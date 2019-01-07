exports.up = function (knex, Promise) {
  return knex.schema.createTable('groups_with_channels', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('group_id').unsigned().references('id').inTable('groups').onDelete('CASCADE');
    t.integer('channel_id').unsigned().references('id').inTable('channels').onDelete('CASCADE');
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.unique(['group_id', 'channel_id']);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('groups_with_channels');
};

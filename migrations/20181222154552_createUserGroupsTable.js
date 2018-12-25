exports.up = function (knex, Promise) {
  return knex.schema.createTable('user_groups', function (t) {
    t.increments('id').unsigned().primary();
    t.integer('user_id').unsigned().references('id').inTable('users');
    t.integer('group_id').unsigned().references('id').inTable('groups');
    t.string('name', 100).notNull();
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.unique(['user_id', 'group_id']);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('user_groups');
};

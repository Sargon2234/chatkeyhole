exports.up = function (knex, Promise) {
  return knex.schema.createTable('group_channel_invitations', function (t) {
    t.increments('id').unsigned().primary();
    t.string('invitation_code').notNull();
    t.integer('group_to_join').unsigned().references('id').inTable('groups').notNull().onDelete('CASCADE');
    t.integer('channel_used').unsigned().references('id').inTable('channels').nullable().onDelete('CASCADE');
    t.enu('status', ['created', 'activated']);
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.unique('invitation_code');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('group_channel_invitations');
};

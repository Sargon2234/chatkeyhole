exports.up = function (knex, Promise) {
  return knex.schema.createTable('user_invitations', function (t) {
    t.increments('id').unsigned().primary();
    t.string('invitation_code').notNull();
    t.integer('inviter_user_id').unsigned().references('id').inTable('users').notNull().onDelete('CASCADE');
    t.integer('channel_id').unsigned().references('id').inTable('channels').notNull();
    t.integer('invited_user_id').unsigned().nullable();
    t.enu('status', ['created', 'activated']);
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.unique('invitation_code');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('user_invitations');
};

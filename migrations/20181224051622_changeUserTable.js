exports.up = function (knex, Promise) {
  return knex.schema.alterTable('users', (t) => {
    t.renameColumn('chat_id', 'tg_user_id');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('users', (t) => {
    t.renameColumn('tg_user_id', 'chat_id');
  });
};

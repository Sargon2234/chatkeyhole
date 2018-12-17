exports.up = function (knex, Promise) {
  return knex.schema.createTable('texts', function (t) {
    t.increments('id').unsigned().primary();
    t.string('key').notNull();
    t.string('text').notNull();
    t.enu('language', ['en', 'ru', 'ua']);
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('texts');
};

exports.up = function (knex, Promise) {
  return knex.schema.createTable('texts', function (t) {
    t.increments('id').unsigned().primary();
    t.string('key').notNull();
    t.text('text').notNull();
    t.enu('language', ['en', 'ru', 'ua']);
    t.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.unique(['key', 'language']);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('texts');
};

import knex from 'knex';

const db = knex({
  client: 'mysql2',
  connection: {
    host: 'tg-db',
    user: process.env.MYSQL_ROOT_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
  },
});

export { db };
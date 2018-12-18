const config = require('./config');

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      database: config.database,
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      database: config.database,
      user: config.user,
      password: config.password,
      host: config.prod_host,
      port: config.port,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },

};

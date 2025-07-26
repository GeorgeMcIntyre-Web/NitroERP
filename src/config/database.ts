import { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const databaseConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nitroerp_dev',
      user: process.env.DB_USER || 'nitroerp_user',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: '../src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: '../src/database/seeds',
    },
    debug: process.env.NODE_ENV === 'development',
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'nitroerp_test',
      user: process.env.TEST_DB_USER || 'nitroerp_user',
      password: process.env.TEST_DB_PASSWORD || 'password',
      ssl: false,
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: '../src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: '../src/database/seeds',
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 5,
      max: 20,
    },
    migrations: {
      directory: '../src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: '../src/database/seeds',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 10,
      max: 50,
    },
    migrations: {
      directory: '../src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: '../src/database/seeds',
    },
  },
};

export default databaseConfig; 
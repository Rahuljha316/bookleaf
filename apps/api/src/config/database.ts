import { Sequelize, Options } from 'sequelize';
import { env } from './env';

const dbOptions: Options = {
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? console.log : false,
};

if (env.DB_SSL || env.NODE_ENV === 'production') {
  dbOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
}

export const sequelize = env.DATABASE_URL
  ? new Sequelize(env.DATABASE_URL, dbOptions)
  : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      ...dbOptions,
    });


import path from 'path';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from './database';

const migrationsDir = path.resolve(__dirname, '../migrations');

export const migrator = new Umzug({
  migrations: {
    glob: ['*.{ts,js}', { cwd: migrationsDir }],
    resolve: ({ name, path: filePath, context }) => {
      // Dynamic import works with tsx and CommonJS dist
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migration = filePath ? require(filePath) : undefined;
      return {
        name,
        up: async () => migration.up({ context }),
        down: async () => migration.down({ context }),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: 'sequelize_meta',
  }),
  logger: console,
});


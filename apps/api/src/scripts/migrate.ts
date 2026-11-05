import { migrator } from '../config/migrator';
import { sequelize } from '../config/database';

async function runMigrations(): Promise<void> {
  console.log('[DB] Connecting to database...');
  try {
    await sequelize.authenticate();
    console.log('[DB] Database connection established successfully.');
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DB] Connection error:', error.message);
    console.error('\nPlease check your database credentials in .env:');
    console.error('- DATABASE_URL (for Neon or local PostgreSQL)');
    console.error('- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL\n');
    process.exit(1);
  }

  try {
    console.log('[DB] Running pending migrations...');
    const executed = await migrator.up();
    if (executed.length === 0) {
      console.log('[DB] Database is already up to date. No migrations executed.');
    } else {
      console.log(`[DB] Successfully executed ${executed.length} migration(s):`);
      executed.forEach((m) => console.log(`  ✓ ${m.name}`));
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DB] Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

void runMigrations();


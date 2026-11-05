import { migrator } from '../config/migrator';
import { sequelize } from '../config/database';

async function rollback(): Promise<void> {
  const args = process.argv.slice(2);
  const rollbackAll = args.includes('--all');

  console.log('[DB] Connecting to database...');
  try {
    await sequelize.authenticate();
    console.log('[DB] Database connection established successfully.');
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DB] Connection error:', error.message);
    process.exit(1);
  }

  try {
    if (rollbackAll) {
      console.log('[DB] Rolling back ALL migrations...');
      const rolledBack = await migrator.down({ to: 0 });
      console.log(`[DB] Rolled back ${rolledBack.length} migration(s).`);
      rolledBack.forEach((m) => console.log(`  ↺ ${m.name}`));
    } else {
      console.log('[DB] Rolling back last migration...');
      const rolledBack = await migrator.down();
      if (rolledBack.length === 0) {
        console.log('[DB] No executed migrations found to rollback.');
      } else {
        console.log(`[DB] Rolled back migration:`);
        rolledBack.forEach((m) => console.log(`  ↺ ${m.name}`));
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[DB] Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

void rollback();


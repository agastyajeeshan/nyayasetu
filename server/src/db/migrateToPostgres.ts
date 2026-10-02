import { PostgresService } from './postgres.js';
import { db } from './database.js';
import { config } from '../config/index.js';

async function runMigration() {
  console.log('====================================================');
  console.log(' NYAYASETU AI - POSTGRESQL DATABASE MIGRATION TOOL  ');
  console.log('====================================================');
  console.log(`Connecting to PostgreSQL host: ${config.pgHost}:${config.pgPort}, user: ${config.pgUser}, db: ${config.pgDatabase}...`);

  const test = await PostgresService.testConnection();
  if (!test.connected) {
    console.error('\n❌ Could not connect to PostgreSQL server:');
    console.error('   ', test.error);
    console.log('\n💡 Tip: You can configure PostgreSQL credentials in server/.env:');
    console.log('   PGHOST=localhost');
    console.log('   PGPORT=5432');
    console.log('   PGUSER=postgres');
    console.log('   PGPASSWORD=<your-postgres-password>');
    console.log('   PGDATABASE=nyayasetu_db');
    console.log('\nOr set DATABASE_URL=postgresql://postgres:<password>@localhost:5432/nyayasetu_db');
    process.exit(1);
  }

  console.log(`✓ Connected to ${test.version} (database: ${test.database})`);

  // 1. Ensure target DB exists
  await PostgresService.ensureDatabaseExists();

  // 2. Initialize schema
  console.log('\n[Step 1/2] Creating relational tables & indexes from schema.sql...');
  const schemaResult = await PostgresService.initializeSchema();
  if (!schemaResult.success) {
    console.error('❌ Schema initialization failed:', schemaResult.error);
    process.exit(1);
  }
  console.log('✓ Relational schema successfully applied.');

  // 3. Sync records from memory
  console.log('\n[Step 2/2] Migrating active records into PostgreSQL...');
  const syncResult = await PostgresService.syncAllFromMemory(db.rawData());
  if (!syncResult.success) {
    console.error('❌ Sync failed:', syncResult.error);
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('        MIGRATION COMPLETED SUCCESSFULLY!           ');
  console.log('====================================================');
  console.table(syncResult.synced);
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});

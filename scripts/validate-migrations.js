'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { log } = require('./lib-logger');
const { loadEnvironment, resolveDatabaseUrl } = require('./lib-env');

function listMigrationFiles() {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error('Migrations directory not found');
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.sql'))
    .map((file) => path.parse(file).name)
    .sort();
}

async function fetchAppliedMigrations(client) {
  const existsResult = await client.query(
    "SELECT to_regclass('public.pgmigrations') AS table_name"
  );
  const tableExists = Boolean(existsResult.rows[0]?.table_name);
  if (!tableExists) {
    return null;
  }
  const appliedRows = await client.query(
    'SELECT name FROM public.pgmigrations ORDER BY run_on'
  );
  return appliedRows.rows.map((row) => row.name);
}

function logPending(pending) {
  const maxList = 10;
  const display = pending.slice(0, maxList);
  display.forEach((name) => log.info(`Pending: ${name}`));
  if (pending.length > maxList) {
    log.info(`Pending: ...and ${pending.length - maxList} more`);
  }
}

async function run() {
  log.header('Migration Validation');
  log.step(1, 'Loading environment...');
  loadEnvironment();

  const databaseUrl = resolveDatabaseUrl();
  const migrationFiles = listMigrationFiles();

  log.step(2, 'Checking applied migrations...');
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const applied = await fetchAppliedMigrations(client);
    if (!applied) {
      throw new Error('No migrations applied. Run: npm run db:migrate');
    }

    const pending = migrationFiles.filter((name) => !applied.includes(name));
    if (pending.length > 0) {
      logPending(pending);
      throw new Error(`${pending.length} pending migration(s) found`);
    }

    log.success('No pending migrations');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  log.error(error.message);
  process.exit(1);
});

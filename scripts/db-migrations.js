/**
 * Migration check and runner extracted from lib-db.js to keep files small.
 */
const { Client } = require('pg');
const { log } = require('./lib-logger');

async function checkAndRunMigrations(databaseUrl) {
  log.step(3, 'Checking database schema...');

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    const migrationCheck = await client.query(
      "SELECT to_regclass('public.pgmigrations') AS table_name"
    );
    const hasMigrations = Boolean(migrationCheck.rows[0]?.table_name);

    if (hasMigrations) {
      const result = await client.query('SELECT name FROM public.pgmigrations ORDER BY run_on');
      const appliedCount = result.rows.length;
      log.success(`Database schema exists (${appliedCount} migrations applied)`);
      return appliedCount > 0;
    } else {
      log.warn('No migrations applied yet. Attempting to run migrations...');

      try {
        const { execSync } = require('child_process');
        // run migrations using project's script
        execSync('node scripts/run-migrations.js up', { stdio: 'inherit' });
        // re-check
        const result = await client.query("SELECT to_regclass('public.pgmigrations') AS table_name");
        const nowHas = Boolean(result.rows[0]?.table_name);
        if (nowHas) {
          const applied = await client.query('SELECT name FROM public.pgmigrations ORDER BY run_on');
          log.success(`Migrations applied (${applied.rows.length})`);
          return applied.rows.length > 0;
        }
        log.warn('Migrations did not produce the expected migrations table');
        return false;
      } catch (runErr) {
        log.error(`Failed to run migrations: ${runErr.message}`);
        return false;
      }
    }
  } catch (error) {
    log.warn(`Schema check inconclusive: ${error.message}`);
    return false;
  } finally {
    await client.end();
  }
}

module.exports = { checkAndRunMigrations };

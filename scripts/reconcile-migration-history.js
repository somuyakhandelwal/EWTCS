'use strict';

const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: '.env.local' });

async function reconcileMigrationHistory() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in .env.local');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT name FROM pgmigrations
       WHERE name IN (
         '007_token_blacklist',
         '009_create_bed_stage_log_corrections',
         '007_create_bed_stage_log_corrections',
         '009_token_blacklist'
       )`
    );

    const names = new Set(rows.map((row) => row.name));
    const hasLegacyPair =
      names.has('007_token_blacklist') &&
      names.has('009_create_bed_stage_log_corrections');
    const hasCurrentPair =
      names.has('007_create_bed_stage_log_corrections') &&
      names.has('009_token_blacklist');

    if (hasLegacyPair && !hasCurrentPair) {
      await client.query(
        "UPDATE pgmigrations SET name = '__tmp_migration_swap_007__' WHERE name = '007_token_blacklist'"
      );
      await client.query(
        "UPDATE pgmigrations SET name = '__tmp_migration_swap_009__' WHERE name = '009_create_bed_stage_log_corrections'"
      );
      await client.query(
        "UPDATE pgmigrations SET name = '007_create_bed_stage_log_corrections' WHERE name = '__tmp_migration_swap_009__'"
      );
      await client.query(
        "UPDATE pgmigrations SET name = '009_token_blacklist' WHERE name = '__tmp_migration_swap_007__'"
      );

      console.log('[reconcile] Updated pgmigrations to current naming');
    } else if (hasCurrentPair) {
      console.log('[reconcile] Migration history already aligned');
    } else {
      console.log('[reconcile] Expected migration names not found; no changes applied');
    }

    await client.query(
      "UPDATE pgmigrations SET name = '024_add_housekeeping_role_and_stages' WHERE name = '015_add_housekeeping_role_and_stages'"
    );

    const orderedRows = await client.query(
      `SELECT id, name, run_on,
              ROW_NUMBER() OVER (ORDER BY name) AS expected_id
       FROM pgmigrations
       ORDER BY id`
    );

    const requiresIdNormalization = orderedRows.rows.some(
      (row) => Number(row.id) !== Number(row.expected_id)
    );

    if (requiresIdNormalization) {
      await client.query('CREATE TEMP TABLE tmp_pgmigrations AS SELECT name, run_on FROM pgmigrations');
      await client.query('TRUNCATE TABLE pgmigrations');
      await client.query(
        `INSERT INTO pgmigrations (id, name, run_on)
         SELECT ROW_NUMBER() OVER (ORDER BY name), name, run_on
         FROM tmp_pgmigrations
         ORDER BY name`
      );
      await client.query(
        `SELECT setval(
          pg_get_serial_sequence('pgmigrations', 'id'),
          COALESCE((SELECT MAX(id) FROM pgmigrations), 1),
          true
        )`
      );

      console.log('[reconcile] Normalized pgmigrations ids by migration name order');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

reconcileMigrationHistory().catch((error) => {
  console.error('[reconcile] Failed:', error.message);
  process.exit(1);
});

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Prints the applied/pending migration status to stdout.
 * Extracted from run-migrations.js to keep files under 200 lines.
 */
async function printStatus(databaseUrl) {
    const { Client } = require('pg');
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.sql'))
        .map((file) => path.parse(file).name)
        .sort();

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
        const existsResult = await client.query(
            "SELECT to_regclass('public.pgmigrations') AS table_name"
        );
        const tableExists = Boolean(existsResult.rows[0]?.table_name);
        const applied = tableExists
            ? (await client.query('SELECT name FROM public.pgmigrations ORDER BY run_on')).rows.map(
                (row) => row.name
            )
            : [];

        const pending = files.filter((name) => !applied.includes(name));

        console.log(`[migrations] start: ${new Date().toISOString()}`);
        console.log(`[migrations] applied: ${applied.length}`);
        console.log(`[migrations] pending: ${pending.length}`);

        if (applied.length > 0) {
            console.log('[migrations] applied list:');
            applied.forEach((name) => console.log(`- ${name}`));
        }

        if (pending.length > 0) {
            console.log('[migrations] pending list:');
            pending.forEach((name) => console.log(`- ${name}`));
        } else {
            console.log('[migrations] no pending migrations');
        }

        console.log(`[migrations] end: ${new Date().toISOString()} (success)`);
    } finally {
        await client.end();
    }
}

module.exports = { printStatus };

'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
const { printStatus } = require('./migration-status');
const { applySqlMigrations } = require('./sql-migrations');
const { healDatabaseMigrations } = require('./heal-migrations');
const { loadEnvironment, resolveDatabaseUrl } = require('./lib-env');

const validatePostgresUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'postgresql:' || urlObj.protocol === 'postgres:';
    } catch {
        return false;
    }
};

const shouldHideMigrationNoise = (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
        return false;
    }

    if (/^Can't determine timestamp for \d+$/i.test(trimmed)) {
        return true;
    }

    const noisyFragments = [
        'MODULE_TYPELESS_PACKAGE_JSON',
        'Reparsing as ES module because module syntax was detected.',
        'This incurs a performance overhead.',
        'To eliminate this warning, add "type": "module"',
        '(Use `node --trace-warnings ...` to show where the warning was created)',
    ];

    return noisyFragments.some((fragment) => trimmed.includes(fragment));
};

const writeFilteredOutput = (buffer, outputStream) => {
    const text = (buffer || '').toString();
    if (!text) {
        return;
    }

    const lines = text.split(/\r?\n/).filter((line) => !shouldHideMigrationNoise(line));
    const formatted = lines.join('\n').trim();
    if (formatted) {
        outputStream.write(`${formatted}\n`);
    }
};

const run = async () => {
    loadEnvironment();

    const command = process.argv[2];
    const arg = process.argv[3];

    if (!command) {
        console.error('Missing command. Use: up | down | status | create <name>');
        process.exit(1);
    }

    const databaseUrl = resolveDatabaseUrl();
    if (!validatePostgresUrl(databaseUrl)) {
        console.error('DATABASE_URL must be a valid PostgreSQL connection string');
        process.exit(1);
    }

    process.env.DATABASE_URL = databaseUrl;

    if (command === 'status') {
        printStatus(databaseUrl).catch((error) => {
            console.error(`[migrations] status failed: ${error.message}`);
            process.exit(1);
        });
        return;
    }

    const binPath = require.resolve('node-pg-migrate/bin/node-pg-migrate');
    const migrationsDir = path.resolve(process.cwd(), 'migrations');

    // Apply SQL migrations first (before JS migrations)
    if (command === 'up') {
        try {
            await applySqlMigrations(databaseUrl, migrationsDir);
        } catch (error) {
            console.error(`[migrations] SQL migrations failed: ${error.message}`);
            process.exit(1);
        }
    }

    const args = [];
    const effectiveCommand = command === 'status' ? 'up' : command;
    
    // Filter to only include .js migrations (SQL migrations are handled separately above).
    // node-pg-migrate expects a regex string for ignore-pattern.
    args.push(effectiveCommand, '--migrations-dir', migrationsDir, '--ignore-pattern', '\\.sql$');

    if (command === 'up' || command === 'down') {
        args.push('--no-check-order');
    }

    if (command === 'down') {
        const count = Number.isInteger(Number(arg)) ? Number(arg) : 1;
        args.push('--count', String(count), '--single-transaction');
    }

    if (command === 'create') {
        if (!arg) {
            console.error('Missing migration name. Example: npm run db:create add_beds_table');
            process.exit(1);
        }
        args.push(arg, '--migration-filename-format', 'timestamp');
    }

    if (command === 'up') {
        args.push('--single-transaction');
    }

    // Self-heal: correct any mis-named pgmigrations rows so node-pg-migrate's order-check passes.
    if (command === 'up') {
        await healDatabaseMigrations(databaseUrl);
    }

    console.log(`[migrations] start: ${new Date().toISOString()}`);
    console.log(`[migrations] command: node-pg-migrate ${args.join(' ')}`);

    const result = spawnSync(process.execPath, [binPath, ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
        encoding: 'utf8',
    });

    writeFilteredOutput(result.stdout, process.stdout);
    writeFilteredOutput(result.stderr, process.stderr);

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    const exitCode = result.status ?? 0;
    const statusLabel = exitCode === 0 ? 'success' : 'failed';
    console.log(`[migrations] end: ${new Date().toISOString()} (${statusLabel})`);
    process.exit(exitCode);
};

run().catch((err) => {
    console.error(`[migrations] fatal: ${err.message}`);
    process.exit(1);
});

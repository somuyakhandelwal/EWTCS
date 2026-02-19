'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createDecipheriv, scryptSync } = require('crypto');
const dotenv = require('dotenv');

const SALT = 'EWTCS_SALT_2026';
const DEFAULT_ENV = 'development';

const loadEnvFiles = () => {
    const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;
    const baseFiles = ['.env', `.env.${nodeEnv}`];

    baseFiles.forEach((file) => {
        const fullPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            const override = file !== '.env';
            dotenv.config({ path: fullPath, override });
        }
    });

    const localPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(localPath)) {
        dotenv.config({ path: localPath, override: true });
    }
};

const deriveEncryptionKey = (seed) => scryptSync(seed, SALT, 32);

const decryptSecret = (encrypted, masterSecret) => {
    const [ivHex, encryptedHex] = encrypted.split(':');
    if (!ivHex || !encryptedHex) {
        throw new Error('Encrypted secret must be in ivhex:encryptedhex format');
    }

    const key = deriveEncryptionKey(masterSecret);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

const validatePostgresUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'postgresql:' || urlObj.protocol === 'postgres:';
    } catch {
        return false;
    }
};

const resolveDatabaseUrl = () => {
    const encrypted = process.env.DATABASE_URL_ENCRYPTED;
    const plaintext = process.env.DATABASE_URL;
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;

    if (encrypted) {
        if (!encryptionKey) {
            throw new Error('ENCRYPTION_KEY is required to decrypt DATABASE_URL_ENCRYPTED');
        }
        return decryptSecret(encrypted, encryptionKey);
    }

    if (nodeEnv === 'production' && !encrypted) {
        throw new Error('DATABASE_URL_ENCRYPTED is required in production');
    }

    if (!plaintext) {
        throw new Error('DATABASE_URL is required when no encrypted value is provided');
    }

    return plaintext;
};

const run = async () => {
    loadEnvFiles();

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

    const args = [];
    const effectiveCommand = command === 'status' ? 'up' : command;
    args.push(effectiveCommand, '--migrations-dir', migrationsDir, '--verbose');

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

    // Self-heal: fix migration tracker entries mis-ordered by the 007/009 renumbering in PRs #161/#162.
    // IDs 7 and 9 had their names swapped relative to their run_on/id sequence, causing node-pg-migrate
    // checkOrder to fail for any developer who ran migrations before the renaming PRs were merged.
    // Using id-based WHERE clauses is idempotent: rows already correct are unaffected; fresh installs
    // have no pgmigrations table yet and the catch handles that safely.
    if (command === 'up') {
        const { Client } = require('pg');
        const healClient = new Client({ connectionString: databaseUrl });
        try {
            await healClient.connect();
            // id=7 must carry the 007-prefixed name so it sorts before id=9's 009-prefixed name
            await healClient.query(
                "UPDATE pgmigrations SET name = '007_create_bed_stage_log_corrections' WHERE id = 7 AND name <> '007_create_bed_stage_log_corrections'"
            );
            await healClient.query(
                "UPDATE pgmigrations SET name = '009_token_blacklist' WHERE id = 9 AND name <> '009_token_blacklist'"
            );
        } catch {
            // pgmigrations may not exist yet on a fresh install — safe to ignore
        } finally {
            await healClient.end().catch(() => {});
        }
    }

    console.log(`[migrations] start: ${new Date().toISOString()}`);
    console.log(`[migrations] command: node-pg-migrate ${args.join(' ')}`);

    const result = spawnSync(process.execPath, [binPath, ...args], {
        stdio: 'inherit',
        env: process.env,
    });

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

const { printStatus } = require('./migration-status');

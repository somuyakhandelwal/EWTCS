'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createDecipheriv, scryptSync } = require('crypto');
const dotenv = require('dotenv');
const { printStatus } = require('./migration-status');

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
    // All updates are idempotent — rows already at the correct name are unaffected.
    // Fresh installs have no pgmigrations table yet; the catch handles that safely.
    if (command === 'up') {
        const { Client } = require('pg');
        const healClient = new Client({ connectionString: databaseUrl });
        try {
            await healClient.connect();
            // 007/009 swap introduced by PRs #161/#162
            await healClient.query(
                "UPDATE pgmigrations SET name = '007_create_bed_stage_log_corrections' WHERE id = 7 AND name <> '007_create_bed_stage_log_corrections'"
            );
            await healClient.query(
                "UPDATE pgmigrations SET name = '009_token_blacklist' WHERE id = 9 AND name <> '009_token_blacklist'"
            );
            // 015-021 renumbering: teammates created duplicate 015 files; during conflict resolution
            // migrations were temporarily numbered 019-025 before settling on the final 015-021 sequence.
            // Heal any DB that went through the intermediate state.
            const renames = [
                ['019_add_password_reset',           '015_add_password_reset'],
                ['020_add_tat_to_admissions',         '016_add_tat_to_admissions'],
                ['021_add_temporary_beds',            '017_add_temporary_beds'],
                ['022_create_shifts',                '018_create_shifts'],
                ['023_add_shift_id_to_logs',         '019_add_shift_id_to_logs'],
                ['024_create_system_settings',       '020_create_system_settings'],
                ['025_create_stage_delay_thresholds','021_create_stage_delay_thresholds'],
                ['015_add_housekeeping_role_and_stages', '024_add_housekeeping_role_and_stages'],
                ['022_create_daily_summaries',       '023_create_daily_summaries'],
            ];
            for (const [oldName, newName] of renames) {
                await healClient.query(
                    `UPDATE pgmigrations SET name = '${newName}' WHERE name = '${oldName}'`
                );
            }
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

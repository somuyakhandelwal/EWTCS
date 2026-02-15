import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    const customUrl = process.env.DATABASE_URL;
    if (!customUrl) {
        console.error('DATABASE_URL is not defined in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString: customUrl,
    });

    try {
        await client.connect();
        console.log('Connected to database...');

        // Get all SQL files from migrations folder
        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        // Create migrations table if not exists
        await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Get executed migrations
        const { rows: executed } = await client.query('SELECT name FROM migrations');
        const executedNames = new Set(executed.map(r => r.name));

        for (const file of files) {
            if (!executedNames.has(file)) {
                console.log(`Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

                await client.query('BEGIN');
                try {
                    await client.query(sql);
                    await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    await client.query('COMMIT');
                    console.log(`Success: ${file}`);
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error(`Failed: ${file}`, err);
                    process.exit(1);
                }
            } else {
                console.log(`Skipping already executed: ${file}`);
            }
        }

        console.log('All migrations completed.');
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();

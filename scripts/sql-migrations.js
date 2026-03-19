'use strict';
const fs = require('fs');
const path = require('path');

const applySqlMigrations = async (databaseUrl, migrationsDir) => {
    const { Client } = require('pg');
    const client = new Client({ connectionString: databaseUrl });

    try {
        await client.connect();

        // Ensure pgmigrations table exists for tracking
        await client.query(`
            CREATE TABLE IF NOT EXISTS pgmigrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                run_on TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        // Get all .sql migration files, sorted numerically
        const sqlFiles = fs.readdirSync(migrationsDir)
            .filter(f => /^\d{3}_.*\.sql$/.test(f))
            .sort((a, b) => {
                const numA = parseInt(a.match(/^\d{3}/)[0], 10);
                const numB = parseInt(b.match(/^\d{3}/)[0], 10);
                return numA - numB;
            });

        console.log(`[migrations] Found ${sqlFiles.length} SQL migration files`);

        for (const file of sqlFiles) {
            // Check if already applied
            const result = await client.query(
                'SELECT id FROM pgmigrations WHERE name = $1',
                [file.replace('.sql', '')]
            );

            if (result.rows.length > 0) {
                console.log(`[migrations]   ✓ ${file} (already applied)`);
                continue;
            }

            // Read and execute the SQL file
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf-8');

            console.log(`[migrations]   → Applying ${file}`);

            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO pgmigrations (name) VALUES ($1)',
                    [file.replace('.sql', '')]
                );
                console.log(`[migrations]   ✓ ${file}`);
            } catch (error) {
                console.error(`[migrations]   ✗ ${file}`);
                console.error(`[migrations]     Error: ${error.message}`);
                throw error;
            }
        }

        console.log(`[migrations] SQL migrations complete`);
    } finally {
        await client.end();
    }
};

module.exports = { applySqlMigrations };

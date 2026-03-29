'use strict';
const fs = require('fs');
const path = require('path');

const extractUpMigrationSql = (rawSql) => {
    // Execute only the up section when files include both up and down blocks.
    const downMarkerRegex = /^\s*--\s*Down\s+Migration\b.*$/im;
    const match = rawSql.match(downMarkerRegex);

    if (!match || typeof match.index !== 'number') {
        return rawSql;
    }

    return rawSql.slice(0, match.index);
};

const repairLegacyCathLabTable = async (client) => {
    const tableExistsResult = await client.query(`
        SELECT to_regclass('public.cath_lab_procedures') AS table_name
    `);

    if (!tableExistsResult.rows[0]?.table_name) {
        return;
    }

    // Legacy/provisional schemas may have this table without the canonical bed_id.
    // Repair it before 051 index creation so SQL migration execution stays stable.
    await client.query(`
        ALTER TABLE cath_lab_procedures
            ADD COLUMN IF NOT EXISTS bed_id UUID,
            ADD COLUMN IF NOT EXISTS patient_uhid VARCHAR(100),
            ADD COLUMN IF NOT EXISTS cardiologist_id UUID,
            ADD COLUMN IF NOT EXISTS status VARCHAR(20),
            ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS procedure_type VARCHAR(100)
    `);

    await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_cath_lab_procedures_bed_id'
            ) THEN
                ALTER TABLE cath_lab_procedures
                    ADD CONSTRAINT fk_cath_lab_procedures_bed_id
                    FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL;
            END IF;
        END $$;
    `);
};

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

        await repairLegacyCathLabTable(client);

        // Get all .sql migration files, sorted numerically
        const sqlFiles = fs.readdirSync(migrationsDir)
            .filter(f => /^\d+_.*\.sql$/.test(f))
            .sort((a, b) => {
                const numA = BigInt(a.match(/^\d+/)[0]);
                const numB = BigInt(b.match(/^\d+/)[0]);
                if (numA !== numB) {
                    return numA < numB ? -1 : 1;
                }
                return a.localeCompare(b);
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
            const rawSql = fs.readFileSync(filePath, 'utf-8');
            const sql = extractUpMigrationSql(rawSql).trim();

            if (!sql) {
                console.log(`[migrations]   ↷ ${file} (no up migration SQL found)`);
                await client.query(
                    'INSERT INTO pgmigrations (name, run_on) VALUES ($1, NOW())',
                    [file.replace('.sql', '')]
                );
                continue;
            }

            console.log(`[migrations]   → Applying ${file}`);

            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO pgmigrations (name, run_on) VALUES ($1, NOW())',
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

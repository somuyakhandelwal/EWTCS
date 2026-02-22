const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('--- Database Check ---');

        // Check tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', tablesResult.rows.map(r => r.table_name).join(', '));

        const correctionsExists = tablesResult.rows.some(r => r.table_name === 'bed_stage_log_corrections');
        console.log('bed_stage_log_corrections exists:', correctionsExists);

        if (correctionsExists) {
            const columnsResult = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'bed_stage_log_corrections'
            `);
            console.log('Columns in bed_stage_log_corrections:', columnsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
        }

        // Check if there are any users
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        console.log('Users count:', usersCount.rows[0].count);

        // Check if there are any bed_stage_logs
        const logsCount = await pool.query('SELECT COUNT(*) FROM bed_stage_logs');
        console.log('Bed stage logs count:', logsCount.rows[0].count);

        if (logsCount.rows[0].count > 0) {
            const sampleLog = await pool.query('SELECT id FROM bed_stage_logs LIMIT 1');
            console.log('Sample Log ID:', sampleLog.rows[0].id);
        }

    } catch (err) {
        console.error('Error during check:', err);
    } finally {
        await pool.end();
    }
}

check();

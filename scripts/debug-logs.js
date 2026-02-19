
const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

const loadEnvFiles = () => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const baseFiles = ['.env', `.env.${nodeEnv}`];
    baseFiles.forEach((file) => {
        const fullPath = path.resolve(process.cwd(), file);
        if (require('fs').existsSync(fullPath)) {
            dotenv.config({ path: fullPath, override: file !== '.env' });
        }
    });
};

loadEnvFiles();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function debugLogs() {
    await client.connect();
    try {
        console.log('--- Beds ---');
        const beds = await client.query('SELECT id, bed_number, current_stage_id, is_occupied FROM beds');
        console.table(beds.rows);

        console.log('\n--- Users ---');
        const users = await client.query('SELECT id, username, role FROM users');
        console.table(users.rows);

        console.log('\n--- Bed Stage Logs ---');
        const logs = await client.query(`
            SELECT 
                l.id, 
                l.bed_id, 
                b.bed_number,
                l.from_stage_id, 
                l.to_stage_id, 
                l.changed_by_user_id,
                u.username as changed_by_username
            FROM bed_stage_logs l
            LEFT JOIN beds b ON l.bed_id = b.id
            LEFT JOIN users u ON l.changed_by_user_id = u.id
            ORDER BY l.transition_time DESC LIMIT 10
        `);
        console.table(logs.rows);

        if (logs.rows.length === 0) {
            console.log('NO LOGS FOUND!');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

debugLogs();

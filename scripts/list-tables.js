
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function listTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Tables found:');
        res.rows.forEach(row => console.log(`- ${row.table_name}`));
    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        await pool.end();
    }
}

listTables();

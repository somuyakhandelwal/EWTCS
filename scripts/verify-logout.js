
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkLogoutData() {
    try {
        console.log('\n--- 🔍 Checking Database for Logout Evidence ---\n');

        // 1. Check Audit Logs
        const auditRes = await pool.query(`
      SELECT action_type, entity_type, performed_by_user_id, created_at 
      FROM audit_logs 
      WHERE action_type = 'LOGOUT' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

        if (auditRes.rows.length > 0) {
            console.log('✅ Audit Log Found:', auditRes.rows[0]);
        } else {
            console.log('❌ No Audit Logs for LOGOUT found yet.');
        }

        // 2. Check Token Blacklist
        const blacklistRes = await pool.query(`
      SELECT token, expires_at, created_at 
      FROM token_blacklist 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

        if (blacklistRes.rows.length > 0) {
            console.log('✅ Blacklisted Token Found:', {
                token: blacklistRes.rows[0].token.substring(0, 20) + '...',
                created_at: blacklistRes.rows[0].created_at
            });
        } else {
            console.log('❌ No Blacklisted Tokens found yet.');
        }

        console.log('\n-----------------------------------------------\n');
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkLogoutData();

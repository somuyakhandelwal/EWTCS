import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });

async function checkTables() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database...\n');

        // Check for audit_logs table
        const auditLogsCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'audit_logs'
            );
        `);
        console.log('audit_logs table exists:', auditLogsCheck.rows[0].exists);

        // Check for user_management_logs table
        const userMgmtLogsCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_management_logs'
            );
        `);
        console.log('user_management_logs table exists:', userMgmtLogsCheck.rows[0].exists);

        // List all tables
        const allTables = await client.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
        `);
        console.log('\nAll tables in database:');
        allTables.rows.forEach(row => console.log('  -', row.tablename));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkTables();

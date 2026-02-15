import { config } from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

config({ path: '.env.local' });

async function reset() {
    const customUrl = process.env.DATABASE_URL;
    if (!customUrl) {
        console.error('DATABASE_URL is not defined');
        process.exit(1);
    }

    const client = new Client({ connectionString: customUrl });

    try {
        await client.connect();

        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Force Update
        await client.query(`
            UPDATE users 
            SET password_hash = $1, 
                failed_login_attempts = 0, 
                lockout_until = NULL 
            WHERE username = 'admin'
        `, [hashedPassword]);

        console.log('Admin password forcefully reset to: admin123');
        console.log('Lockout cleared.');

    } catch (err) {
        console.error('Reset error:', err);
    } finally {
        await client.end();
    }
}

reset();

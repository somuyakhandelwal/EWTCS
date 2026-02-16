import { config } from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

config({ path: '.env.local' });

async function verify() {
    const customUrl = process.env.DATABASE_URL;
    const client = new Client({ connectionString: customUrl });

    try {
        await client.connect();

        const res = await client.query("SELECT * FROM users WHERE username = 'admin'");
        const user = res.rows[0];

        if (!user) {
            console.error('User admin NOT FOUND');
            return;
        }

        const match = await bcrypt.compare('admin123', user.password_hash);

        if (match) {
            console.log('SUCCESS: Password "admin123" matches hash for user "admin"');
        } else {
            console.error('FAILURE: Password "admin123" DOES NOT match hash');
        }

    } catch (err) {
        console.error('Verification error:', err);
    } finally {
        await client.end();
    }
}

verify();

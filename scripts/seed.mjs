import { config } from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

config({ path: '.env.local' });

async function seed() {
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

        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Check if admin exists
        const checkAdmin = await client.query("SELECT id FROM users WHERE username = 'admin'");
        if (checkAdmin.rows.length === 0) {
            await client.query(`
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, 'admin')
      `, ['admin', hashedPassword]);
            console.log('Seeded admin user.');
        } else {
            console.log('Admin user already exists.');
        }

        // Seed Nurse
        const checkNurse = await client.query("SELECT id FROM users WHERE username = 'nurse'");
        if (checkNurse.rows.length === 0) {
            const nursePassword = await bcrypt.hash('nurse123', 10);
            await client.query(`
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, 'nurse')
      `, ['nurse', nursePassword]);
            console.log('Seeded nurse user.');
        } else {
            console.log('Nurse user already exists.');
        }

        // Seed Supervisor
        const checkSupervisor = await client.query("SELECT id FROM users WHERE username = 'supervisor'");
        if (checkSupervisor.rows.length === 0) {
            const supervisorPassword = await bcrypt.hash('supervisor123', 10);
            await client.query(`
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, 'supervisor')
      `, ['supervisor', supervisorPassword]);
            console.log('Seeded supervisor user.');
        } else {
            console.log('Supervisor user already exists.');
        }

    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seed();

import { config } from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

// Load env vars
config({ path: '.env.local' });

/**
 * Test script to verify user management functionality
 * Creates test users for admin, supervisor, and nurse roles
 */
async function createTestUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('✓ Connected to database');

        // Check if test users already exist
        const existingUsers = await client.query(
            `SELECT username FROM users WHERE username IN ('admin_test', 'supervisor_test', 'nurse_test')`
        );

        if (existingUsers.rows.length > 0) {
            console.log('\n⚠️  Test users already exist:');
            existingUsers.rows.forEach(user => console.log(`  - ${user.username}`));
            console.log('\nDelete them first if you want to recreate them.');
            return;
        }

        // Create test users
        const testUsers = [
            { username: 'admin_test', password: 'admin123', role: 'admin' },
            { username: 'supervisor_test', password: 'super123', role: 'supervisor' },
            { username: 'nurse_test', password: 'nurse123', role: 'nurse' },
        ];

        console.log('\n📝 Creating test users...\n');

        for (const user of testUsers) {
            const passwordHash = await bcrypt.hash(user.password, 10);
            
            await client.query(
                `INSERT INTO users (username, password_hash, role, is_active) 
                VALUES ($1, $2, $3, TRUE)`,
                [user.username, passwordHash, user.role]
            );

            console.log(`✓ Created: ${user.username} (${user.role})`);
            console.log(`  Password: ${user.password}`);
        }

        console.log('\n✅ All test users created successfully!\n');
        console.log('📋 Login credentials:');
        console.log('  Admin:      admin_test / admin123');
        console.log('  Supervisor: supervisor_test / super123');
        console.log('  Nurse:      nurse_test / nurse123\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

createTestUsers();

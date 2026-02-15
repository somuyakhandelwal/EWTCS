/**
 * Database operations for system initialization
 */

const { Client } = require('pg');
const { log } = require('./lib-logger');

/**
 * Validate environment variables
 */
async function validateEnvironment() {
  log.step(1, 'Validating environment variables...');

  try {
    const { resolveDatabaseUrl } = require('./lib-env');
    const databaseUrl = resolveDatabaseUrl();
    log.success('Environment variables validated');
    return databaseUrl;
  } catch (error) {
    log.error(`Environment validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test database connection
 */
async function testConnection(databaseUrl) {
  log.step(2, 'Testing database connection...');

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    // simple lightweight check
    await client.query('SELECT 1');
    log.success('Database connection successful');
    return true;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Check and run migrations if needed
 */
const { checkAndRunMigrations } = require('./db-migrations');

/**
 * Verify users table exists
 */
async function verifyUsersTable(databaseUrl) {
  log.step(4, 'Verifying users table structure...');

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    const tableCheck = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users' AND table_schema = 'public'
      )`
    );

    if (!tableCheck.rows[0].exists) {
      throw new Error('Users table does not exist. Run migrations first: npm run db:migrate');
    }

    const columnsCheck = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND table_schema = 'public'`
    );

    const columns = columnsCheck.rows.map((r) => r.column_name);
    const requiredColumns = ['id', 'username', 'password_hash', 'role'];
    const missingColumns = requiredColumns.filter((col) => !columns.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Missing columns in users table: ${missingColumns.join(', ')}`);
    }

    log.success('Users table structure verified');
  } catch (error) {
    log.error(`Table verification failed: ${error.message}`);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Setup admin user (idempotent)
 */
async function setupAdminUser(databaseUrl) {
  log.step(5, 'Setting up admin user...');

  const client = new Client({ connectionString: databaseUrl });
  const bcrypt = require('bcrypt');

  try {
    await client.connect();

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      log.warn('ADMIN_PASSWORD not set. Generating temporary password...');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ADMIN_PASSWORD must be set in production');
      }
      const tempPassword = generateTempPassword();
      process.env.ADMIN_PASSWORD = tempPassword;
      log.warn(`Temporary password generated: ${tempPassword}`);
      log.warn('⚠️  Change this immediately after first login!');
    }

    const password = process.env.ADMIN_PASSWORD;
    const existingResult = await client.query(
      'SELECT id, role FROM users WHERE username = $1',
      [adminUsername]
    );

    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0];
      
      if (existingUser.role === 'admin') {
        log.info(`Admin user "${adminUsername}" already exists`);
        
        if (process.env.ADMIN_PASSWORD) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, existingUser.id]
          );
          log.info('Admin password updated');
        }
      } else {
        throw new Error(`User "${adminUsername}" exists but is not admin (role: ${existingUser.role})`);
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertResult = await client.query(
        `INSERT INTO users (username, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, username, role`,
        [adminUsername, hashedPassword, 'admin']
      );

      const adminUser = insertResult.rows[0];
      log.success(`Admin user created: ${adminUser.username} (ID: ${adminUser.id})`);
    }

    log.success('Admin user setup complete');
  } catch (error) {
    log.error(`Admin user setup failed: ${error.message}`);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Generate temporary password
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

module.exports = {
  validateEnvironment,
  testConnection,
  checkAndRunMigrations,
  verifyUsersTable,
  setupAdminUser,
  generateTempPassword,
};

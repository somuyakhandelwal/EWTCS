#!/usr/bin/env node

/**
 * EWTCS System Initialization Script (Main Entry Point)
 * Purpose: Initialize database schema and create initial admin user
 * Usage: npm run init
 */

const { loadEnvironment } = require('./lib-env');
const { log, COLORS } = require('./lib-logger');
const {
  validateEnvironment,
  testConnection,
  checkAndRunMigrations,
  verifyUsersTable,
  setupAdminUser,
} = require('./lib-db');

/**
 * Execute full system initialization
 */
async function initializeSystem() {
  try {
    log.header('🏥 EWTCS System Initialization');
    log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    log.info(`Timestamp: ${new Date().toISOString()}\n`);

    // Load environment
    loadEnvironment();

    // Step 1: Validate environment
    const databaseUrl = await validateEnvironment();

    // Step 2: Test database connection
    await testConnection(databaseUrl);

    // Step 3: Check schema status
    const hasMigrations = await checkAndRunMigrations(databaseUrl);

    // If no migrations applied, exit with instructions
    if (!hasMigrations) {
      log.section('\n📋 Next Steps:');
      console.log(`\n  ${COLORS.cyan}Run migrations:${COLORS.reset}`);
      console.log(`    ${COLORS.yellow}npm run db:migrate${COLORS.reset}\n`);
      console.log(`  ${COLORS.cyan}Then run init again:${COLORS.reset}`);
      console.log(`    ${COLORS.yellow}npm run init${COLORS.reset}\n`);
      process.exit(0);
    }

    // Step 4: Verify users table
    await verifyUsersTable(databaseUrl);

    // Step 5: Setup admin user
    await setupAdminUser(databaseUrl);

    // Success summary
    log.header('🎉 System Initialization Complete!');
    
    log.section('📋 Next Steps:');
    console.log(`\n  1. ${COLORS.yellow}Start development server:${COLORS.reset}`);
    console.log(`     npm run dev\n`);
    console.log(`  2. ${COLORS.yellow}Open in browser:${COLORS.reset}`);
    console.log(`     http://localhost:3000\n`);
    console.log(`  3. ${COLORS.yellow}Login with credentials:${COLORS.reset}`);
    console.log(`     Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`     Password: ${process.env.ADMIN_PASSWORD ? '(your-password)' : 'See above'}\n`);
    console.log(`  4. ${COLORS.red}⚠️  Change password immediately!${COLORS.reset}\n`);

    log.section('📚 Documentation:');
    console.log(`\n  • Setup Guide: ${COLORS.cyan}CONFIGURATION.md${COLORS.reset}`);
    console.log(`  • Database: ${COLORS.cyan}npm run db:status${COLORS.reset}`);
    console.log(`  • Project: ${COLORS.cyan}README.md${COLORS.reset}\n`);

    process.exit(0);
  } catch (error) {
    log.header('❌ Initialization Failed');
    log.error(error.message);

    log.section('\n🔧 Troubleshooting:');
    console.log(`\n  • Check .env.local exists and has DATABASE_URL`);
    console.log(`  • Ensure PostgreSQL server is running`);
    console.log(`  • Run migrations first: ${COLORS.yellow}npm run db:migrate${COLORS.reset}`);
    console.log(`  • Check database credentials\n`);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Error details:\n${error.stack}\n`);
    }

    process.exit(1);
  }
}

// Self-executing with error handling
if (require.main === module) {
  initializeSystem().catch((error) => {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { initializeSystem };

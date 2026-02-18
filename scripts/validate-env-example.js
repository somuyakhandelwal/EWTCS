#!/usr/bin/env node
'use strict';

/**
 * Validates .env.example file completeness and format
 * Usage: node scripts/validate-env-example.js
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const REQUIRED_VARIABLES = [
  {
    name: 'DATABASE_URL',
    description: 'PostgreSQL connection string',
    example: 'postgresql://postgres:password@localhost:5432/ewtcs'
  },
  {
    name: 'SESSION_SECRET',
    description: 'JWT session secret (minimum 32 characters)',
    example: 'your-secret-key-change-this-in-production-min-32-chars'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Application URL',
    example: 'http://localhost:3000'
  },
  {
    name: 'NODE_ENV',
    description: 'Environment (development | staging | production)',
    example: 'development'
  }
];

// Optional but recommended variables
const RECOMMENDED_VARIABLES = [
  'RED_ALERT_THRESHOLD_MS',
  'NEXT_PUBLIC_REALTIME_ENABLED',
  'NEXT_PUBLIC_REALTIME_POLLING_INTERVAL_MS'
];

const validateEnvExample = () => {
  console.log('🔍 Validating .env.example file...\n');

  const envExamplePath = path.resolve(process.cwd(), '.env.example');

  // Check if .env.example exists
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example file not found');
    console.error('Create .env.example with all required environment variables');
    process.exit(1);
  }

  const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
  const lines = envExampleContent.split('\n');

  // Parse variables from .env.example
  const envVariables = new Map();
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (trimmedLine.startsWith('#') || trimmedLine === '') {
      return;
    }

    // Parse variable
    const match = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match) {
      const varName = match[1];
      const value = trimmedLine.substring(varName.length + 1);
      envVariables.set(varName, {
        value,
        lineNumber: index + 1
      });
    }
  });

  console.log(`📋 Found ${envVariables.size} environment variables in .env.example\n`);

  // Check for required variables
  let hasErrors = false;
  const missingRequired = [];

  console.log('Checking required variables:\n');

  REQUIRED_VARIABLES.forEach((required) => {
    if (envVariables.has(required.name)) {
      const varInfo = envVariables.get(required.name);
      console.log(`  ✅ ${required.name} (line ${varInfo.lineNumber})`);
      
      // Validate the value is not empty
      if (!varInfo.value || varInfo.value.trim() === '') {
        console.log(`     ⚠️  Warning: Value is empty`);
      }
      
      // Check if it's a placeholder that needs to be changed
      if (varInfo.value.includes('your-') || varInfo.value.includes('change-this')) {
        console.log(`     ℹ️  Contains placeholder value (expected for .env.example)`);
      }
    } else {
      console.log(`  ❌ ${required.name} - MISSING`);
      missingRequired.push(required);
      hasErrors = true;
    }
  });

  if (missingRequired.length > 0) {
    console.error('\n❌ Missing required variables:\n');
    missingRequired.forEach((variable) => {
      console.error(`  Variable: ${variable.name}`);
      console.error(`  Description: ${variable.description}`);
      console.error(`  Example: ${variable.name}=${variable.example}`);
      console.error('');
    });
  }

  // Check for recommended variables
  console.log('\nChecking recommended variables:\n');

  RECOMMENDED_VARIABLES.forEach((varName) => {
    if (envVariables.has(varName)) {
      console.log(`  ✅ ${varName}`);
    } else {
      console.log(`  ⚠️  ${varName} - Not found (optional but recommended)`);
    }
  });

  // Check for common issues
  console.log('\n🔍 Checking for common issues:\n');

  // Check for actual secrets (should use placeholders)
  const suspiciousPatterns = [
    { pattern: /sk-[a-zA-Z0-9]{32,}/, name: 'OpenAI API key' },
    { pattern: /postgres:\/\/.*:[^@]{8,}@/, name: 'Database password' },
    { pattern: /[0-9a-f]{64}/, name: 'Long hex string (possible secret)' }
  ];

  let foundSuspicious = false;
  suspiciousPatterns.forEach((check) => {
    if (check.pattern.test(envExampleContent)) {
      console.log(`  ⚠️  Warning: Possible real ${check.name} detected`);
      console.log(`     .env.example should only contain placeholder values`);
      foundSuspicious = true;
    }
  });

  if (!foundSuspicious) {
    console.log('  ✅ No suspicious values detected');
  }

  // Check for documentation
  const hasDocumentation = envExampleContent.includes('#') && 
                          (envExampleContent.toLowerCase().includes('setup') || 
                           envExampleContent.toLowerCase().includes('configuration'));

  if (hasDocumentation) {
    console.log('  ✅ Contains documentation/comments');
  } else {
    console.log('  ⚠️  Consider adding comments to explain variables');
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  
  if (hasErrors) {
    console.error('\n❌ .env.example validation FAILED');
    console.error('Please add all required environment variables');
    process.exit(1);
  } else {
    console.log('\n✅ .env.example validation PASSED');
    console.log('\nAll required environment variables are documented.');
    console.log('Developers can copy this file to .env.local to get started.');
    process.exit(0);
  }
};

validateEnvExample();

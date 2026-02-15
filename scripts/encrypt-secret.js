#!/usr/bin/env node

const { createCipheriv, randomBytes, scryptSync } = require('crypto');

const [,, plaintext, encryptionKey] = process.argv;

if (!plaintext || !encryptionKey) {
  console.error('Usage: node scripts/encrypt-secret.js "plaintext" "encryption_key"');
  process.exit(1);
}

try {
  const key = scryptSync(encryptionKey, 'EWTCS_SALT_2026', 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const output = `${iv.toString('hex')}:${encrypted}`;
  console.log(output);
} catch (error) {
  console.error('Failed to encrypt secret:', error.message);
  process.exit(1);
}

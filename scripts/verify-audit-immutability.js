'use strict';

const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: '.env.local' });

async function verifyAuditImmutability() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required in .env.local');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const userResult = await client.query(
      'SELECT id FROM users ORDER BY created_at ASC LIMIT 1'
    );

    if (!userResult.rows[0]) {
      console.log('[verify] skipped: no users found');
      return;
    }

    const userId = userResult.rows[0].id;
    const insertResult = await client.query(
      `INSERT INTO audit_logs
        (action_type, entity_type, entity_id, performed_by_user_id, changes, reason, metadata, ip_address)
       VALUES
        ('TEST_IMMUTABILITY', 'user', $1, $1, '{}'::jsonb, 'immutability-check', '{}'::jsonb, '127.0.0.1')
       RETURNING id`,
      [userId]
    );

    const logId = insertResult.rows[0].id;
    let updateBlocked = false;
    let deleteBlocked = false;

    try {
      await client.query('UPDATE audit_logs SET reason = $1 WHERE id = $2', [
        'tamper-attempt',
        logId,
      ]);
    } catch {
      updateBlocked = true;
    }

    try {
      await client.query('DELETE FROM audit_logs WHERE id = $1', [logId]);
    } catch {
      deleteBlocked = true;
    }

    console.log(
      `[verify] immutability: updateBlocked=${updateBlocked} deleteBlocked=${deleteBlocked}`
    );

    if (!updateBlocked || !deleteBlocked) {
      throw new Error('Audit immutability verification failed');
    }

    console.log('[verify] audit log immutability verified successfully');
  } finally {
    await client.end();
  }
}

verifyAuditImmutability().catch((error) => {
  console.error('[verify] failed:', error.message);
  process.exit(1);
});

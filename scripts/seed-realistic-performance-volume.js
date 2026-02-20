#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFiles() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  ['.env', `.env.${nodeEnv}`, '.env.local'].forEach((file, index) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: index > 0 });
    }
  });
}

async function main() {
  loadEnvFiles();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const targetBeds = Number.parseInt(process.env.PERF_TARGET_BEDS || '150', 10);
  const logsPerBed = Number.parseInt(process.env.PERF_LOGS_PER_BED || '300', 10);
  const maxDaysBack = Number.parseInt(process.env.PERF_MAX_DAYS_BACK || '14', 10);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const userResult = await client.query("SELECT id FROM users ORDER BY created_at ASC LIMIT 1");
    if (userResult.rows.length === 0) {
      throw new Error('No users found; run seed script first');
    }
    const userId = userResult.rows[0].id;

    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO beds (
        bed_number, current_stage_id, patient_start_time, last_stage_change,
        is_occupied, is_active, metadata
      )
      SELECT
        CONCAT('PERF-', LPAD(gs::text, 4, '0')),
        s.id,
        NOW() - ((RANDOM() * 12)::int || ' hours')::interval,
        NOW() - ((RANDOM() * 6)::int || ' hours')::interval,
        true,
        true,
        '{}'::jsonb
      FROM generate_series(1, $1) gs
      CROSS JOIN LATERAL (
        SELECT id FROM stages WHERE is_active = true ORDER BY RANDOM() LIMIT 1
      ) s
      ON CONFLICT (bed_number) DO NOTHING
      `,
      [targetBeds]
    );

    const selectedBedsResult = await client.query(
      `SELECT id FROM beds WHERE is_active = true AND bed_number LIKE 'PERF-%'`
    );

    if (selectedBedsResult.rows.length === 0) {
      throw new Error('No PERF-* beds available after seeding');
    }

    const bedIds = selectedBedsResult.rows.map((row) => row.id);
    const stageIdsResult = await client.query(`SELECT id FROM stages WHERE is_active = true`);
    const stageIds = stageIdsResult.rows.map((row) => row.id);

    const insertSql = `
      INSERT INTO bed_stage_logs (
        bed_id, from_stage_id, to_stage_id, changed_by_user_id,
        transition_time, duration_in_previous_stage_ms, notes, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, '{}'::jsonb)
    `;

    for (const bedId of bedIds) {
      for (let index = 0; index < logsPerBed; index += 1) {
        const toStage = stageIds[Math.floor(Math.random() * stageIds.length)];
        const fromStage = Math.random() < 0.15 ? null : stageIds[Math.floor(Math.random() * stageIds.length)];
        const minutesBack = Math.floor(Math.random() * maxDaysBack * 24 * 60);
        const transitionTime = new Date(Date.now() - minutesBack * 60 * 1000);
        const durationMs = Math.floor(Math.random() * 4 * 60 * 60 * 1000) + 30_000;

        await client.query(insertSql, [
          bedId,
          fromStage,
          toStage,
          userId,
          transitionTime,
          durationMs,
          'performance-volume-seed',
        ]);
      }
    }

    await client.query('COMMIT');

    const counts = await client.query(
      `
      SELECT
        (SELECT COUNT(*) FROM beds WHERE is_active = true) AS active_beds,
        (SELECT COUNT(*) FROM bed_stage_logs) AS stage_logs
      `
    );

    console.log('✅ Realistic performance dataset seeded');
    console.log({
      targetBeds,
      logsPerBed,
      createdPerfBeds: bedIds.length,
      activeBeds: Number(counts.rows[0].active_beds),
      stageLogs: Number(counts.rows[0].stage_logs),
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Failed to seed realistic performance data');
  console.error(error.message);
  process.exit(1);
});

#!/usr/bin/env node
'use strict';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const DASHBOARD_SLA_MS = 2000;
const REPORTS_SLA_MS = 3000;

function loadEnvFiles() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  ['.env', `.env.${nodeEnv}`, '.env.local'].forEach((file, index) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: index > 0 });
    }
  });
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[i];
}

async function timeMs(fn) {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

async function dashboardIteration(client) {
  const threshold = await client.query(
    "SELECT value FROM system_settings WHERE key = 'delay_threshold_minutes'"
  );
  const thresholdMs = (Number.parseInt(threshold.rows[0]?.value || '180', 10) || 180) * 60 * 1000;

  await Promise.all([
    client.query(
      `
      SELECT b.id, b.bed_number, b.current_stage_id, b.patient_start_time, b.last_stage_change,
             b.is_occupied, b.is_active, b.is_temporary, b.is_virtual,
             CASE
               WHEN b.is_occupied AND b.patient_start_time IS NOT NULL
               THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.patient_start_time)) * 1000
               ELSE NULL
             END AS elapsed_ms,
             CASE
               WHEN b.is_occupied AND b.patient_start_time IS NOT NULL
                    AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.patient_start_time)) * 1000 >
                      COALESCE((SELECT sdt.threshold_minutes * 60000.0 FROM stage_delay_thresholds sdt
                                WHERE sdt.stage_id = b.current_stage_id), $1)
               THEN true
               ELSE false
             END AS is_delayed
      FROM beds b
      WHERE b.is_active = true
      ORDER BY b.bed_number ASC
      `,
      [thresholdMs]
    ),
    client.query(`SELECT id, name, display_order FROM stages WHERE is_active = true ORDER BY display_order ASC`),
  ]);
}

async function reportsIteration(client) {
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endDate = new Date();

  await Promise.all([
    client.query(
      `
      SELECT s.id, s.name,
             COUNT(bsl.id), AVG(bsl.duration_in_previous_stage_ms),
             PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms)
      FROM stages s
      LEFT JOIN bed_stage_logs bsl ON s.id = bsl.to_stage_id
      WHERE bsl.transition_time >= $1 AND bsl.transition_time <= $2
      GROUP BY s.id, s.name
      `,
      [startDate, endDate]
    ),
    client.query(
      `
      SELECT b.id, b.bed_number,
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_log.last_transition)) * 1000 AS wait_ms
      FROM beds b
      LEFT JOIN LATERAL (
        SELECT MAX(transition_time) AS last_transition
        FROM bed_stage_logs
        WHERE bed_id = b.id
      ) last_log ON true
      WHERE b.is_active = true AND b.is_occupied = true
      ORDER BY wait_ms DESC
      LIMIT 10
      `
    ),
    client.query(
      `
      WITH bed_stats AS (
        SELECT bed_id, MAX(transition_time) AS last_transition_time, COUNT(*) AS transition_count
        FROM bed_stage_logs
        GROUP BY bed_id
      )
      SELECT COUNT(DISTINCT b.id), COALESCE(SUM(bs.transition_count), 0),
             COALESCE(AVG(EXTRACT(EPOCH FROM (bs.last_transition_time - COALESCE(b.patient_start_time, CURRENT_TIMESTAMP))) * 1000), 0)
      FROM beds b
      LEFT JOIN bed_stats bs ON b.id = bs.bed_id
      WHERE b.is_active = true
      `
    ),
  ]);
}

async function main() {
  loadEnvFiles();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const minBeds = Number.parseInt(process.env.PERF_MIN_BEDS || '100', 10);
  const minLogs = Number.parseInt(process.env.PERF_MIN_LOGS || '30000', 10);
  const warmups = Number.parseInt(process.env.PERF_WARMUP_RUNS || '5', 10);
  const runs = Number.parseInt(process.env.PERF_MEASURE_RUNS || '40', 10);

  try {
    const volume = await client.query(
      `SELECT (SELECT COUNT(*) FROM beds WHERE is_active = true) AS beds,
              (SELECT COUNT(*) FROM bed_stage_logs) AS logs`
    );

    const bedCount = Number(volume.rows[0].beds);
    const logCount = Number(volume.rows[0].logs);

    if (bedCount < minBeds || logCount < minLogs) {
      console.error('🚨 ALERT: Dataset volume is below required realistic threshold');
      console.error({ bedCount, logCount, minBeds, minLogs });
      process.exit(3);
    }

    for (let i = 0; i < warmups; i += 1) {
      await dashboardIteration(client);
      await reportsIteration(client);
    }

    const dashboardMs = [];
    const reportsMs = [];

    for (let i = 0; i < runs; i += 1) {
      dashboardMs.push(await timeMs(() => dashboardIteration(client)));
      reportsMs.push(await timeMs(() => reportsIteration(client)));
    }

    const dashboardP95 = percentile(dashboardMs, 95);
    const reportsP95 = percentile(reportsMs, 95);

    console.log('Performance Gate Results', {
      runs,
      bedCount,
      logCount,
      dashboardP95,
      reportsP95,
    });

    const dashboardPass = dashboardP95 < DASHBOARD_SLA_MS;
    const reportsPass = reportsP95 < REPORTS_SLA_MS;

    if (!dashboardPass || !reportsPass) {
      console.error('🚨 ALERT: Performance regression detected');
      console.error({ dashboardP95, reportsP95, dashboardPass, reportsPass });
      process.exit(2);
    }

    console.log('✅ PASS: Performance gate satisfied');
    await client.end();
  } catch (error) {
    await client.end();
    throw error;
  }
}

main().catch((error) => {
  console.error('❌ Performance gate failed to execute');
  console.error(error.message);
  process.exit(1);
});

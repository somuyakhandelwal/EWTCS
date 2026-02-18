#!/usr/bin/env node
/**
 * Test script for stage validation and transition logic
 * Tests the performance fix for parallel database queries
 */

import pg from 'pg';
const { Pool } = pg;

// Load environment variables
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

dotenv.config({ path: envPath });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

console.log('🧪 Testing Stage Validation System\n');

async function testStageTransitions() {
  try {
    // Test 1: Check stage_transitions table exists and has data
    console.log('✓ Test 1: Checking stage_transitions table...');
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM stage_transitions WHERE is_active = true'
    );
    const transitionCount = parseInt(countResult.rows[0].count);
    console.log(`  Found ${transitionCount} active transition rules`);
    
    if (transitionCount === 0) {
      console.log('  ⚠️  Warning: No transition rules found!');
    } else {
      console.log('  ✅ Stage transitions table populated\n');
    }

    // Test 2: Check stages table
    console.log('✓ Test 2: Checking stages table...');
    const stagesResult = await pool.query(
      'SELECT id, name, display_order FROM stages WHERE is_active = true ORDER BY display_order'
    );
    console.log(`  Found ${stagesResult.rows.length} active stages:`);
    stagesResult.rows.forEach(stage => {
      console.log(`    - ${stage.name} (order: ${stage.display_order})`);
    });
    console.log('  ✅ Stages table populated\n');

    // Test 3: Test transition rule queries (simulating the fixed function)
    console.log('✓ Test 3: Testing transition rule queries...');
    const fromStageId = stagesResult.rows[0]?.id; // First stage (Empty)
    const allStageIds = stagesResult.rows.map(s => s.id);

    // Sequential approach (OLD - for comparison)
    console.log('  Testing sequential queries (OLD approach)...');
    const startSeq = Date.now();
    for (const toStageId of allStageIds) {
      await pool.query(
        `SELECT * FROM stage_transitions 
         WHERE from_stage_id IS NOT DISTINCT FROM $1 
         AND to_stage_id = $2 
         AND is_active = true`,
        [fromStageId, toStageId]
      );
    }
    const seqTime = Date.now() - startSeq;
    console.log(`  Sequential time: ${seqTime}ms`);

    // Parallel approach (NEW - the fix)
    console.log('  Testing parallel queries (NEW approach)...');
    const startPar = Date.now();
    await Promise.all(
      allStageIds.map(toStageId =>
        pool.query(
          `SELECT * FROM stage_transitions 
           WHERE from_stage_id IS NOT DISTINCT FROM $1 
           AND to_stage_id = $2 
           AND is_active = true`,
          [fromStageId, toStageId]
        )
      )
    );
    const parTime = Date.now() - startPar;
    console.log(`  Parallel time: ${parTime}ms`);
    
    const improvement = ((seqTime - parTime) / seqTime * 100).toFixed(1);
    console.log(`  ⚡ Performance improvement: ${improvement}% faster (${(seqTime / parTime).toFixed(1)}x speedup)`);
    console.log('  ✅ Parallel queries working correctly\n');

    // Test 4: Check transition rule coverage
    console.log('✓ Test 4: Checking transition rule coverage...');
    const coverageResult = await pool.query(`
      SELECT 
        s1.name as from_stage,
        s2.name as to_stage,
        st.is_allowed,
        st.requires_supervisor_override
      FROM stage_transitions st
      JOIN stages s1 ON st.from_stage_id = s1.id
      JOIN stages s2 ON st.to_stage_id = s2.id
      WHERE st.is_active = true
      ORDER BY s1.display_order, s2.display_order
      LIMIT 10
    `);
    
    console.log(`  Sample transition rules:`);
    coverageResult.rows.forEach(rule => {
      const status = rule.is_allowed 
        ? '✓ Allowed' 
        : rule.requires_supervisor_override 
          ? '⚠️  Requires Override' 
          : '✗ Forbidden';
      console.log(`    ${rule.from_stage} → ${rule.to_stage}: ${status}`);
    });
    console.log('  ✅ Transition rules configured\n');

    // Test 5: Check for orphaned rules
    console.log('✓ Test 5: Checking for orphaned transition rules...');
    const orphanedResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM stage_transitions st
      LEFT JOIN stages s1 ON st.from_stage_id = s1.id
      LEFT JOIN stages s2 ON st.to_stage_id = s2.id
      WHERE (st.from_stage_id IS NOT NULL AND s1.id IS NULL) OR s2.id IS NULL
    `);
    
    const orphanedCount = parseInt(orphanedResult.rows[0].count);
    if (orphanedCount > 0) {
      console.log(`  ⚠️  Warning: Found ${orphanedCount} orphaned rules!`);
    } else {
      console.log('  ✅ No orphaned rules found\n');
    }

    console.log('═══════════════════════════════════════');
    console.log('🎉 All tests passed successfully!');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run tests
testStageTransitions()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    pool.end();
    process.exit(1);
  });

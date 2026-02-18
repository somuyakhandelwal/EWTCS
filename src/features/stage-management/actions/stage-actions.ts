'use server';

import { query, default as pool } from '@/shared/lib/db';
import { revalidatePath } from 'next/cache';
import type { Stage, CreateStageInput, UpdateStageInput } from '../types/stage.types';

// Fetch all active stages ordered by display order
export async function getStages(): Promise<Stage[]> {
  const result = await query(
    'SELECT * FROM stages WHERE is_active = TRUE ORDER BY display_order ASC'
  );
  return result.rows as Stage[];
}

// Create a new stage
export async function createStage(input: CreateStageInput) {
  if (!input.name || input.name.trim().length === 0)
    throw new Error('Stage name is required');
  if (input.name.length > 50)
    throw new Error('Stage name must be max 50 characters');

  const max = await query('SELECT MAX(display_order) as m FROM stages');
  const nextOrder = (max.rows[0].m ?? 0) + 1;

  await query(
    'INSERT INTO stages (name, color_code, description, display_order) VALUES ($1,$2,$3,$4)',
    [input.name.trim(), input.color_code, input.description ?? null, nextOrder]
  );
  revalidatePath('/admin/stages');
}

// Update an existing stage
export async function updateStage(input: UpdateStageInput) {
  if (input.name && input.name.length > 50)
    throw new Error('Stage name must be max 50 characters');

  await query(
    `UPDATE stages SET
       name = COALESCE($1, name),
       color_code = COALESCE($2, color_code),
       description = COALESCE($3, description),
       updated_at = NOW()
     WHERE id = $4`,
    [input.name?.trim(), input.color_code, input.description, input.id]
  );
  revalidatePath('/admin/stages');
}

// Delete a stage (only non-default stages can be deleted)
export async function deleteStage(id: string) {
  const result = await query(
    'UPDATE stages SET is_active = FALSE WHERE id = $1 AND is_default = FALSE RETURNING id',
    [id]
  );
  if (result.rowCount === 0)
    throw new Error('Default stages cannot be deleted');
  revalidatePath('/admin/stages');
}

// Reorder stages
export async function reorderStages(orderedIds: string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE stages SET display_order = $1 WHERE id = $2',
        [i + 1, orderedIds[i]]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  revalidatePath('/admin/stages');
}
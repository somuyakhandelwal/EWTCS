'use server';

import { query, default as pool } from '@/shared/lib/db';
import { revalidatePath } from 'next/cache';
import type { Stage, CreateStageInput, UpdateStageInput } from '../types/stage.types';
import { requireAdmin } from '@/shared/lib/auth';
import { logAudit } from '@/shared/lib/audit';
import { headers } from 'next/headers';
import { getClientIpFromHeaders } from '@/shared/lib/request-ip';

async function getAuditContext() {
  const session = await requireAdmin();
  const requestHeaders = await headers();
  const ipAddress = getClientIpFromHeaders(requestHeaders);

  return {
    userId: session.userId,
    username: session.username,
    role: session.role,
    ipAddress,
  };
}

function getAuditMetadata(actor: { username: string; role: string }) {
  return { category: 'configuration', username: actor.username, role: actor.role };
}

// Fetch all active stages ordered by display order
export async function getStages(): Promise<Stage[]> {
  const result = await query(
    'SELECT * FROM stages WHERE is_active = TRUE ORDER BY display_order ASC'
  );
  return result.rows as Stage[];
}

// Create a new stage
export async function createStage(input: CreateStageInput) {
  const actor = await getAuditContext();

  if (!input.name || input.name.trim().length === 0)
    throw new Error('Stage name is required');
  if (input.name.length > 50)
    throw new Error('Stage name must be max 50 characters');

  const max = await query('SELECT MAX(display_order) as m FROM stages');
  const nextOrder = (max.rows[0].m ?? 0) + 1;

  const result = await query(
    'INSERT INTO stages (name, color_code, description, display_order) VALUES ($1,$2,$3,$4) RETURNING id, name, color_code, description, display_order',
    [input.name.trim(), input.color_code, input.description ?? null, nextOrder]
  );

  const createdStage = result.rows[0];

  await logAudit({
    actionType: 'STAGE_CONFIG_CREATE',
    entityType: 'stage',
    entityId: createdStage.id,
    performedBy: actor.userId,
    changes: {
      after: createdStage,
    },
    metadata: getAuditMetadata(actor),
    ipAddress: actor.ipAddress,
  });

  revalidatePath('/admin/stages');
}

// Update an existing stage
export async function updateStage(input: UpdateStageInput) {
  const actor = await getAuditContext();

  if (input.name && input.name.length > 50)
    throw new Error('Stage name must be max 50 characters');

  const beforeResult = await query(
    'SELECT id, name, color_code, description, display_order, is_active FROM stages WHERE id = $1',
    [input.id]
  );

  const beforeStage = beforeResult.rows[0];
  if (!beforeStage) {
    throw new Error('Stage not found');
  }

  const updatedResult = await query(
    `UPDATE stages SET
       name = COALESCE($1, name),
       color_code = COALESCE($2, color_code),
       description = COALESCE($3, description),
       updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, color_code, description, display_order, is_active`,
    [input.name?.trim(), input.color_code, input.description, input.id]
  );

  const afterStage = updatedResult.rows[0];

  await logAudit({
    actionType: 'STAGE_CONFIG_UPDATE',
    entityType: 'stage',
    entityId: input.id,
    performedBy: actor.userId,
    changes: {
      before: beforeStage,
      after: afterStage,
    },
    metadata: getAuditMetadata(actor),
    ipAddress: actor.ipAddress,
  });

  revalidatePath('/admin/stages');
}

// Delete a stage (only non-default stages can be deleted)
export async function deleteStage(id: string) {
  const actor = await getAuditContext();

  const beforeResult = await query(
    'SELECT id, name, color_code, description, display_order, is_active, is_default FROM stages WHERE id = $1',
    [id]
  );

  const beforeStage = beforeResult.rows[0];
  if (!beforeStage) {
    throw new Error('Stage not found');
  }

  const result = await query(
    'UPDATE stages SET is_active = FALSE WHERE id = $1 AND is_default = FALSE RETURNING id, name, color_code, description, display_order, is_active',
    [id]
  );

  if (result.rowCount === 0)
    throw new Error('Default stages cannot be deleted');

  await logAudit({
    actionType: 'STAGE_CONFIG_DEACTIVATE',
    entityType: 'stage',
    entityId: id,
    performedBy: actor.userId,
    changes: {
      before: beforeStage,
      after: result.rows[0],
    },
    metadata: getAuditMetadata(actor),
    ipAddress: actor.ipAddress,
  });

  revalidatePath('/admin/stages');
}

// Reorder stages
export async function reorderStages(orderedIds: string[]) {
  const actor = await getAuditContext();

  const beforeOrderResult = await query(
    'SELECT id, display_order FROM stages WHERE is_active = TRUE ORDER BY display_order ASC'
  );

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

  await logAudit({
    actionType: 'STAGE_CONFIG_REORDER',
    entityType: 'stage',
    entityId: 'workflow-order',
    performedBy: actor.userId,
    changes: {
      before: beforeOrderResult.rows,
      after: orderedIds.map((id, index) => ({ id, display_order: index + 1 })),
    },
    metadata: getAuditMetadata(actor),
    ipAddress: actor.ipAddress,
  });

  revalidatePath('/admin/stages');
}
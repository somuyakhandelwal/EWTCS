'use server'

import pool from '@/shared/lib/db'
import { requireWriteRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { revalidatePath } from 'next/cache'

export interface DelayReasonOption {
  id: string
  value: string
  label: string
  isActive: boolean
  displayOrder: number
}

export async function getActiveDelayReasonOptions(): Promise<DelayReasonOption[]> {
  try {
    const result = await pool.query<{
      id: string; value: string; label: string;
      is_active: boolean; display_order: number
    }>(
      `SELECT id, value, label, is_active, display_order
       FROM delay_reason_options
       WHERE is_active = TRUE
       ORDER BY display_order ASC, label ASC`
    )
    return result.rows.map(r => ({
      id: r.id,
      value: r.value,
      label: r.label,
      isActive: r.is_active,
      displayOrder: r.display_order,
    }))
  } catch (error) {
    logger.error('Failed to fetch delay reason options', error as Error)
    return []
  }
}

export async function getAllDelayReasonOptions(): Promise<DelayReasonOption[]> {
  try {
    const result = await pool.query<{
      id: string; value: string; label: string;
      is_active: boolean; display_order: number
    }>(
      `SELECT id, value, label, is_active, display_order
       FROM delay_reason_options
       ORDER BY display_order ASC, label ASC`
    )
    return result.rows.map(r => ({
      id: r.id,
      value: r.value,
      label: r.label,
      isActive: r.is_active,
      displayOrder: r.display_order,
    }))
  } catch (error) {
    logger.error('Failed to fetch all delay reason options', error as Error)
    return []
  }
}

export async function addDelayReasonOption(input: {
  value: string
  label: string
  displayOrder: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireWriteRole(['admin'], {
      actionType: 'CREATE',
      entityType: 'delay_reason_option',
      entityId: input.value,
    })

    const slug = input.value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!slug) return { success: false, error: 'Invalid value' }

    await pool.query(
      `INSERT INTO delay_reason_options (value, label, display_order)
       VALUES ($1, $2, $3)`,
      [slug, input.label.trim(), input.displayOrder]
    )

    revalidatePath('/admin/delay-reasons')
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to add option'
    logger.error('Failed to add delay reason option', error as Error)
    return { success: false, error: msg }
  }
}

export async function toggleDelayReasonOption(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireWriteRole(['admin'], {
      actionType: 'UPDATE',
      entityType: 'delay_reason_option',
      entityId: id,
    })

    await pool.query(
      `UPDATE delay_reason_options SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      [isActive, id]
    )

    revalidatePath('/admin/delay-reasons')
    return { success: true }
  } catch (error) {
    logger.error('Failed to toggle delay reason option', error as Error)
    return { success: false, error: 'Failed to update option' }
  }
}

export async function deleteDelayReasonOption(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireWriteRole(['admin'], {
      actionType: 'DELETE',
      entityType: 'delay_reason_option',
      entityId: id,
    })

    await pool.query(`DELETE FROM delay_reason_options WHERE id = $1`, [id])

    revalidatePath('/admin/delay-reasons')
    return { success: true }
  } catch (error) {
    logger.error('Failed to delete delay reason option', error as Error)
    return { success: false, error: 'Failed to delete option' }
  }
}
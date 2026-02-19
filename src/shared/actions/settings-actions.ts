'use server';

import { query } from '@/shared/lib/db';
import { revalidatePath } from 'next/cache';

/**
 * Get a specific system setting by key
 */
export async function getSystemSetting(key: string): Promise<string | null> {
    const result = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
    if (result.rows.length > 0) {
        return result.rows[0].value;
    }
    return null;
}

/**
 * Update a system setting by key
 */
export async function updateSystemSetting(key: string, value: string): Promise<void> {
    await query(
        `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
    );
    revalidatePath('/admin/stages');
}

/**
 * Get the global default delay threshold in minutes
 */
export async function getDefaultDelayThreshold(): Promise<number> {
    const value = await getSystemSetting('default_delay_threshold_minutes');
    return value ? parseInt(value, 10) : 180; // Default to 180 if not set
}

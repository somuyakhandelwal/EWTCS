import { vi } from 'vitest'

export const RAW_TABLE_ROWS = [
    { table_name: 'audit_logs', total_bytes: '2097152', pretty_size: '2048 kB' },
    { table_name: 'patient_admissions', total_bytes: '1048576', pretty_size: '1024 kB' },
    { table_name: 'patient_admissions_archive', total_bytes: '524288', pretty_size: '512 kB' },
    { table_name: 'audit_logs_archive', total_bytes: '262144', pretty_size: '256 kB' },
    { table_name: 'bed_stage_logs', total_bytes: '786432', pretty_size: '768 kB' },
    { table_name: 'archival_runs', total_bytes: '131072', pretty_size: '128 kB' },
]

export const RAW_DB_SIZE_ROW = { db_bytes: '5368709120' }
export const RAW_THRESHOLD_ROW = { value: '10' }

export function mockAllQueries(querySpy: any, opts: {
    tableRows?: typeof RAW_TABLE_ROWS
    dbBytes?: string
    thresholdValue?: string | null
}) {
    const { tableRows = RAW_TABLE_ROWS, dbBytes = RAW_DB_SIZE_ROW.db_bytes, thresholdValue = '10' } = opts
    let callCount = 0
    vi.mocked(querySpy).mockImplementation(() => {
        const call = callCount++
        if (call === 0) return Promise.resolve({ rows: tableRows }) as never
        if (call === 1) return Promise.resolve({ rows: [{ db_bytes: dbBytes }] }) as never
        if (thresholdValue === null) return Promise.resolve({ rows: [] }) as never
        return Promise.resolve({ rows: [{ value: thresholdValue }] }) as never
    })
}

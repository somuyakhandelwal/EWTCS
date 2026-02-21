/** Raw DB row shape returned by PostgreSQL for patient_admissions_archive */
export const RAW_ADMISSION_ROW = {
    id: 'adm-uuid-1',
    bed_id: 'bed-A1',
    admitted_at: '2024-01-15T08:00:00.000Z',
    discharged_at: '2024-01-16T08:00:00.000Z',
    total_duration_ms: '86400000',
    discharged_by_user_id: 'nurse-uuid-1',
    notes: 'Routine discharge',
    created_at: '2024-01-15T07:55:00.000Z',
    tat_from_previous_discharge_ms: '3600000',
    archived_at: '2025-02-01T00:00:00.000Z',
}

/** Raw DB row shape returned by PostgreSQL for audit_logs_archive */
export const RAW_AUDIT_ROW = {
    id: 'log-uuid-1',
    action_type: 'STAGE_CHANGE',
    entity_type: 'bed',
    entity_id: 'bed-A1',
    performed_by_user_id: 'nurse-uuid-1',
    changes: { from: 'triage', to: 'treatment' },
    reason: 'Patient stabilised',
    metadata: { shiftId: 'shift-1' },
    ip_address: '192.168.1.10',
    created_at: '2024-01-15T09:30:00.000Z',
    archived_at: '2025-02-01T00:00:00.000Z',
}

-- Migration 054: Repair missing stage_transitions table
-- Purpose: Recover databases where migration 010 was marked applied but table is missing
-- Safe to run repeatedly.

-- Up Migration

CREATE TABLE IF NOT EXISTS stage_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
    to_stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    is_allowed BOOLEAN NOT NULL DEFAULT true,
    requires_supervisor_override BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (from_stage_id, to_stage_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_transitions_from ON stage_transitions(from_stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_to ON stage_transitions(to_stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_allowed ON stage_transitions(is_allowed);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_active ON stage_transitions(is_active);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_priority ON stage_transitions(priority);

INSERT INTO stage_transitions (
    from_stage_id,
    to_stage_id,
    is_allowed,
    requires_supervisor_override,
    description,
    priority
)
VALUES
    ((SELECT id FROM stages WHERE name = 'Empty'), (SELECT id FROM stages WHERE name = 'Triage'), true, false, 'Patient arrives. Begin triage.', 10),
    ((SELECT id FROM stages WHERE name = 'Triage'), (SELECT id FROM stages WHERE name = 'Registration'), true, false, 'Triage complete. Proceed to registration.', 10),
    ((SELECT id FROM stages WHERE name = 'Registration'), (SELECT id FROM stages WHERE name = 'Doctor Assessment'), true, false, 'Registration complete. Proceed to doctor assessment.', 10),
    ((SELECT id FROM stages WHERE name = 'Doctor Assessment'), (SELECT id FROM stages WHERE name = 'Treatment/Observation'), true, false, 'Assessment complete. Proceed to treatment/observation.', 10),
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), (SELECT id FROM stages WHERE name = 'Decision Made'), true, false, 'Treatment complete. Decision made.', 10),
    ((SELECT id FROM stages WHERE name = 'Decision Made'), (SELECT id FROM stages WHERE name = 'Discharge Process'), true, false, 'Begin discharge process.', 10),
    ((SELECT id FROM stages WHERE name = 'Discharge Process'), (SELECT id FROM stages WHERE name = 'Cleaning'), true, false, 'Patient discharged. Start cleaning.', 10),
    ((SELECT id FROM stages WHERE name = 'Cleaning'), (SELECT id FROM stages WHERE name = 'Empty'), true, false, 'Cleaning complete. Bed available.', 10),
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), (SELECT id FROM stages WHERE name = 'Doctor Assessment'), false, true, 'Condition changed. Requires reassessment override.', 9),
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), (SELECT id FROM stages WHERE name = 'Triage'), false, true, 'Emergency re-triage requires override.', 8),
    ((SELECT id FROM stages WHERE name = 'Triage'), (SELECT id FROM stages WHERE name = 'Treatment/Observation'), false, true, 'Emergency treatment skip requires override.', 8),
    ((SELECT id FROM stages WHERE name = 'Doctor Assessment'), (SELECT id FROM stages WHERE name = 'Decision Made'), false, true, 'Skip to decision requires override.', 8),
    ((SELECT id FROM stages WHERE name = 'Empty'), (SELECT id FROM stages WHERE name = 'Treatment/Observation'), false, true, 'Emergency readmission requires override.', 8),
    ((SELECT id FROM stages WHERE name = 'Empty'), (SELECT id FROM stages WHERE name = 'Doctor Assessment'), false, true, 'Immediate assessment requires override.', 8)
ON CONFLICT (from_stage_id, to_stage_id) DO NOTHING;

-- Down Migration
-- No-op: repair migration is intentionally irreversible.

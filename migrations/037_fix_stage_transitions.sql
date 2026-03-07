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

COMMENT ON TABLE stage_transitions IS 'Defines valid stage transitions in the emergency ward workflow.';

INSERT INTO stage_transitions (from_stage_id, to_stage_id, is_allowed, requires_supervisor_override, description, priority)
VALUES
    ((SELECT id FROM stages WHERE name = 'Empty'), (SELECT id FROM stages WHERE name = 'Triage'), true, false, 'Patient arrives.', 10),
    ((SELECT id FROM stages WHERE name = 'Triage'), (SELECT id FROM stages WHERE name = 'Registration'), true, false, 'Patient proceeds to registration.', 10),
    ((SELECT id FROM stages WHERE name = 'Registration'), (SELECT id FROM stages WHERE name = 'Doctor Assessment'), true, false, 'Doctor examines patient.', 10),
    ((SELECT id FROM stages WHERE name = 'Doctor Assessment'), (SELECT id FROM stages WHERE name = 'Treatment/Observation'), true, false, 'Doctor orders treatment.', 10),
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), (SELECT id FROM stages WHERE name = 'Decision Made'), true, false, 'Treatment complete.', 10),
    ((SELECT id FROM stages WHERE name = 'Decision Made'), (SELECT id FROM stages WHERE name = 'Discharge Process'), true, false, 'Patient is being discharged.', 10),
    ((SELECT id FROM stages WHERE name = 'Discharge Process'), (SELECT id FROM stages WHERE name = 'Cleaning'), true, false, 'Bed is being cleaned.', 10),
    ((SELECT id FROM stages WHERE name = 'Cleaning'), (SELECT id FROM stages WHERE name = 'Empty'), true, false, 'Bed cleaning complete.', 10),
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), (SELECT id FROM stages WHERE name = 'Doctor Assessment'), false, true, 'Patient condition changes.', 9),
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), (SELECT id FROM stages WHERE name = 'Triage'), false, true, 'Emergency: patient deteriorates.', 8),
    ((SELECT id FROM stages WHERE name = 'Triage'), (SELECT id FROM stages WHERE name = 'Treatment/Observation'), false, true, 'Emergency case.', 8),
    ((SELECT id FROM stages WHERE name = 'Doctor Assessment'), (SELECT id FROM stages WHERE name = 'Decision Made'), false, true, 'Doctor assessment complete.', 8),
    ((SELECT id FROM stages WHERE name = 'Empty'), (SELECT id FROM stages WHERE name = 'Treatment/Observation'), false, true, 'Emergency readmission.', 8),
    ((SELECT id FROM stages WHERE name = 'Empty'), (SELECT id FROM stages WHERE name = 'Doctor Assessment'), false, true, 'Immediate doctor assessment.', 8)
ON CONFLICT (from_stage_id, to_stage_id) DO NOTHING;

-- Down Migration
DROP TABLE IF EXISTS stage_transitions CASCADE;

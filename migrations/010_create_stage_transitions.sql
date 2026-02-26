-- Migration 010: Create Stage Transitions Table
-- Purpose: Define valid stage transitions for workflow validation (US-2.2)
-- Epic: EPIC 2 - One-Click Stage Update System

-- Create stage_transitions table to define valid transitions
CREATE TABLE IF NOT EXISTS stage_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Stage references (from_stage_id can be NULL for "any stage" rules)
    from_stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
    to_stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    
    -- Validation rules
    is_allowed BOOLEAN NOT NULL DEFAULT true,
    requires_supervisor_override BOOLEAN NOT NULL DEFAULT false,
    
    -- Documentation
    reason TEXT,
    description VARCHAR(255),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: only one rule per (from, to) pair
    UNIQUE (from_stage_id, to_stage_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stage_transitions_from ON stage_transitions(from_stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_to ON stage_transitions(to_stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_allowed ON stage_transitions(is_allowed);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_active ON stage_transitions(is_active);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_priority ON stage_transitions(priority);

-- Add comments for documentation
COMMENT ON TABLE stage_transitions IS 'Defines valid stage transitions in the emergency ward workflow. Controls which beds can transition from one stage to another.';
COMMENT ON COLUMN stage_transitions.from_stage_id IS 'Source stage ID. NULL means this rule applies to any current stage.';
COMMENT ON COLUMN stage_transitions.to_stage_id IS 'Destination stage ID (required).';
COMMENT ON COLUMN stage_transitions.is_allowed IS 'Whether this transition is allowed (true) or forbidden (false).';
COMMENT ON COLUMN stage_transitions.requires_supervisor_override IS 'Whether this transition requires supervisor approval to proceed.';
COMMENT ON COLUMN stage_transitions.priority IS 'Rule priority for matching. Higher priority rules override lower ones.';

-- Insert default stage transition rules based on 8-stage emergency ward workflow
-- Expected workflow: Empty → Triage → Registration → Doctor Assessment → 
--                    Treatment → Decision Made → Discharge Process → Cleaning → Empty

INSERT INTO stage_transitions (from_stage_id, to_stage_id, is_allowed, requires_supervisor_override, description, priority)
VALUES
    -- FORWARD TRANSITIONS (always allowed)
    -- Empty → Triage: Patient arrives for initial assessment
    ((SELECT id FROM stages WHERE name = 'Empty'), 
     (SELECT id FROM stages WHERE name = 'Triage'), 
     true, false, 'Patient arrives. Medical staff begins initial assessment and prioritization.', 10),
    
    -- Triage → Registration: Complete standard workflow
    ((SELECT id FROM stages WHERE name = 'Triage'), 
     (SELECT id FROM stages WHERE name = 'Registration'), 
     true, false, 'After triage assessment, patient proceeds to registration and documentation.', 10),
    
    -- Registration → Doctor Assessment: Continue workflow
    ((SELECT id FROM stages WHERE name = 'Registration'), 
     (SELECT id FROM stages WHERE name = 'Doctor Assessment'), 
     true, false, 'After registration, doctor examines patient and orders necessary tests.', 10),
    
    -- Doctor Assessment → Treatment/Observation: Doctor orders treatment or monitoring
    ((SELECT id FROM stages WHERE name = 'Doctor Assessment'), 
     (SELECT id FROM stages WHERE name = 'Treatment/Observation'), 
     true, false, 'Doctor has assessed patient. Begin active treatment or continuous observation.', 10),
    
    -- Treatment → Decision Made: Treatment complete, discharge decision
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), 
     (SELECT id FROM stages WHERE name = 'Decision Made'), 
     true, false, 'Treatment complete or patient stable. Discharge decision is made.', 10),
    
    -- Decision Made → Discharge Process: Start patient discharge
    ((SELECT id FROM stages WHERE name = 'Decision Made'), 
     (SELECT id FROM stages WHERE name = 'Discharge Process'), 
     true, false, 'Discharge decision documented. Patient is being discharged or transferred.', 10),
    
    -- Discharge → Cleaning: Bed cleanup
    ((SELECT id FROM stages WHERE name = 'Discharge Process'), 
     (SELECT id FROM stages WHERE name = 'Cleaning'), 
     true, false, 'Patient has been discharged. Bed is being cleaned and prepared for next patient.', 10),
    
    -- Cleaning → Empty: Bed ready
    ((SELECT id FROM stages WHERE name = 'Cleaning'), 
     (SELECT id FROM stages WHERE name = 'Empty'), 
     true, false, 'Bed cleaning complete. Bed is now ready for the next patient.', 10),
    
    
    -- BACKWARD TRANSITIONS (special cases, mostly require override)
    
    -- Treatment → Doctor Assessment (medical reassessment needed)
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), 
     (SELECT id FROM stages WHERE name = 'Doctor Assessment'), 
     false, true, 'Patient condition changes during treatment. Doctor reassessment required.', 9),
    
    -- Treatment → Triage (emergency situation)
    ((SELECT id FROM stages WHERE name = 'Treatment/Observation'), 
     (SELECT id FROM stages WHERE name = 'Triage'), 
     false, true, 'Emergency: patient deteriorates. Return to triage for re-prioritization.', 8),
    
    
    -- SKIP TRANSITIONS (usually blocked, very special cases)
    
    -- Triage → Treatment (skip Registration & Doctor Assessment - emergency)
    ((SELECT id FROM stages WHERE name = 'Triage'), 
     (SELECT id FROM stages WHERE name = 'Treatment/Observation'), 
     false, true, 'Emergency case: patient requires immediate treatment. Normal workflow skipped.', 8),
    
    -- Doctor Assessment → Decision Made (skip Treatment - patient discharged immediately)
    ((SELECT id FROM stages WHERE name = 'Doctor Assessment'), 
     (SELECT id FROM stages WHERE name = 'Decision Made'), 
     false, true, 'Doctor assessment complete. Patient can be discharged without treatment.', 8),
    
    
    -- EMERGENCY READMISSION (from Empty back to Treatment)
    ((SELECT id FROM stages WHERE name = 'Empty'), 
     (SELECT id FROM stages WHERE name = 'Treatment/Observation'), 
     false, true, 'Emergency readmission: patient returns with acute condition.', 8),

    -- Empty to Doctor Assessment for emergency cases
    ((SELECT id FROM stages WHERE name = 'Empty'), 
     (SELECT id FROM stages WHERE name = 'Doctor Assessment'), 
     false, true, 'Returning patient: immediate doctor assessment needed.', 8)

ON CONFLICT (from_stage_id, to_stage_id) DO NOTHING;

-- Create an audit history comment
COMMENT ON TABLE stage_transitions IS 'Immutable workflow rules. Updated_at tracks rule changes but should maintain audit log separately.';

-- Down Migration
DROP TABLE IF EXISTS stage_transitions;

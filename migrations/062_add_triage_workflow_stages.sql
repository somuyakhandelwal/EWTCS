-- EPIC 25: Separate Triage Area from Emergency Ward Workflow
-- This migration separates Triage stages from ER stages by adding an 'area' discriminator
-- column to the 'stages' table. It then inserts the four required Triage-specific stages.

BEGIN;

-- Step 1: Add the 'area' column to the 'stages' table to differentiate workflows.
-- We default existing stages to 'ER' as they all belong to the main emergency room flow.
ALTER TABLE stages
ADD COLUMN area VARCHAR(20) NOT NULL DEFAULT 'ER'
CHECK (area IN ('ER', 'TRIAGE'));

-- Step 2: Explicitly update existing stages to be part of the 'ER' area.
-- This is technically redundant due to the default, but it makes the migration's intent clear.
UPDATE stages SET area = 'ER' WHERE area IS NULL OR area != 'TRIAGE';

-- Step 3: Insert the new, dedicated stages for the Triage workflow.
-- These stages are specific to the 6-bed Triage area and will not appear in the ER.
-- Display order uses high numbers (100+) to avoid conflicts with ER stages (0-7).
INSERT INTO stages (name, display_order, color_code, description, area) VALUES
('Triage Empty', 100, 'gray', 'Triage bed is available and ready for next patient', 'TRIAGE'),
('Triage Initial Treatment', 101, 'blue', 'Patient receiving initial assessment and triage', 'TRIAGE'),
('Triage Decision Made', 102, 'green', 'Triage decision made - ready for disposition', 'TRIAGE'),
('Triage Cleaning', 103, 'pink', 'Triage bed being cleaned and prepared for next patient', 'TRIAGE');

-- Step 4: Reset the current stage for the 6 Triage beds to a known starting point.
-- We find the ID of the new 'Triage Empty' stage and assign it to all beds in the 'Triage Area' ward.
-- This prevents them from being stuck in an invalid (ER) state when the application restarts.
DO $$
DECLARE
    triage_ward_id UUID;
    triage_empty_stage_id UUID;
BEGIN
    -- Get the ID for the 'Triage Area' ward
    SELECT id INTO triage_ward_id FROM wards WHERE name = 'Triage Area' LIMIT 1;

    -- Get the ID for the new 'Triage Empty' stage
    SELECT id INTO triage_empty_stage_id FROM stages WHERE name = 'Triage Empty' AND area = 'TRIAGE' LIMIT 1;

    -- If both IDs were found, update the beds in the Triage ward
    IF triage_ward_id IS NOT NULL AND triage_empty_stage_id IS NOT NULL THEN
        UPDATE beds
        SET current_stage_id = triage_empty_stage_id
        WHERE ward_id = triage_ward_id;
    END IF;
END $$;


COMMIT;

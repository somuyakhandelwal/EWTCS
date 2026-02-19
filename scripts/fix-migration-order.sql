-- Fix migration name AND ID order to match filesystem
-- Background: Migrations 006-009 were applied but names don't match filesystem order

BEGIN;

-- Save current state to temp table
CREATE TEMP TABLE temp_migrations AS 
SELECT id, name, run_on FROM pgmigrations WHERE id BETWEEN 6 AND 9;

-- Get the earliest timestamp for consistent ordering
DO $$
DECLARE
    base_timestamp TIMESTAMP;
BEGIN
    SELECT MIN(run_on) INTO base_timestamp FROM temp_migrations;
    
    -- Delete the 4 rows
    DELETE FROM pgmigrations WHERE id BETWEEN 6 AND 9;
    
    -- Reinsert in correct order with sequential timestamps
    -- All get the same base timestamp to maintain they ran "together"
    INSERT INTO pgmigrations (id, name, run_on)
    VALUES 
        (6, '006_add_ward_access_control', base_timestamp),
        (7, '007_create_bed_stage_log_corrections', base_timestamp),
        (8, '008_add_bed_stage_log_immutability', base_timestamp),
        (9, '009_token_blacklist', base_timestamp);
END $$;

-- Verify the changes
SELECT id, name, run_on FROM pgmigrations ORDER BY id;

COMMIT;

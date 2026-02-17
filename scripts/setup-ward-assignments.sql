-- Quick Ward Assignment Setup
-- Run this SQL to assign users and beds to wards for testing

-- 1. View available wards
SELECT id, name, code FROM wards;

-- 2. Assign nurses to Emergency Ward A
UPDATE users 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWA') 
WHERE username IN ('nurse', 'nurse1');

-- 3. Assign all beds to Emergency Ward A (for testing)
UPDATE beds 
SET ward_id = (SELECT id FROM wards WHERE code = 'EWA'),
    ward_name = 'Emergency Ward A'
WHERE bed_number LIKE 'ER-%';

-- 4. Verify assignments
SELECT username, role, w.name as ward_name, w.code as ward_code
FROM users u
LEFT JOIN wards w ON u.ward_id = w.id
WHERE role IN ('nurse', 'supervisor');

SELECT bed_number, ward_name, COUNT(*) OVER() as total_beds_assigned
FROM beds
WHERE ward_id IS NOT NULL
ORDER BY bed_number
LIMIT 5;

-- Optional: Distribute beds across all 3 wards
-- UPDATE beds 
-- SET ward_id = (SELECT id FROM wards WHERE code = 'EWA'),
--     ward_name = 'Emergency Ward A'
-- WHERE bed_number BETWEEN 'ER-01' AND 'ER-17';

-- UPDATE beds 
-- SET ward_id = (SELECT id FROM wards WHERE code = 'EWB'),
--     ward_name = 'Emergency Ward B'
-- WHERE bed_number BETWEEN 'ER-18' AND 'ER-34';

-- UPDATE beds 
-- SET ward_id = (SELECT id FROM wards WHERE code = 'EWC'),
--     ward_name = 'Emergency Ward C'
-- WHERE bed_number BETWEEN 'ER-35' AND 'ER-50';

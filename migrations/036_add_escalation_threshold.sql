-- Up Migration
INSERT INTO system_settings (key, value, description)
VALUES ('escalation_threshold_minutes', '360', 'Threshold in minutes (e.g., 360 for 6 hours) after which a delayed patient is flagged for critical escalation')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Down Migration
DELETE FROM system_settings WHERE key = 'escalation_threshold_minutes';

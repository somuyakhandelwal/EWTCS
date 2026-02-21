/* eslint-disable camelcase */

exports.up = (pgm) => {
    pgm.sql(`
    INSERT INTO system_settings (key, value, description)
    VALUES ('escalation_threshold_minutes', '240', 'Threshold in minutes (e.g., 240 for 4 hours) after which a delayed patient is flagged for critical escalation')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `)
}

exports.down = (pgm) => {
    pgm.sql(`
    DELETE FROM system_settings WHERE key = 'escalation_threshold_minutes';
  `)
}

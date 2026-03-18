/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE beds
      ADD COLUMN IF NOT EXISTS patient_uhid varchar(100),
      ADD COLUMN IF NOT EXISTS patient_name varchar(255),
      ADD COLUMN IF NOT EXISTS key_symptom text,
      ADD COLUMN IF NOT EXISTS triage_category varchar(50);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('beds', ['patient_uhid', 'patient_name', 'key_symptom', 'triage_category']);
};

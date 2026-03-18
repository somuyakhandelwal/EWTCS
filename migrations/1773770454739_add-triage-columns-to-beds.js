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
  pgm.addColumns('beds', {
    patient_uhid: { type: 'varchar(100)' },
    patient_name: { type: 'varchar(255)' },
    key_symptom: { type: 'text' },
    triage_category: { type: 'varchar(50)' }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('beds', ['patient_uhid', 'patient_name', 'key_symptom', 'triage_category']);
};

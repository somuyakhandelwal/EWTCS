'use strict';

const ALLOWED_DUPLICATE_GROUPS = new Map([
  ['015', ['015_add_password_reset', '015_add_tat_to_admissions']],
  ['038', ['038_add_delay_reason_options', '038_create_alert_preferences']],
  ['040', ['040_create_user_feedback', '040_enable_pgcrypto']],
  ['047', ['047_add_cath_lab_roles', '047_add_doctor_and_cardiologist_roles', '047_enforce_symptom_40_char_limit']],
  ['058', ['058_normalize_delay_reason_fk', '058_repair_cath_lab_procedures_columns']],
]);

function validateDuplicateGroups(migrationFiles) {
  const numberToNames = new Map();

  for (const name of migrationFiles) {
    const match = name.match(/^(\d+)_/);
    if (!match) continue;

    const number = match[1];
    const existing = numberToNames.get(number) ?? [];
    existing.push(name);
    numberToNames.set(number, existing);
  }

  const duplicates = Array.from(numberToNames.entries()).filter(([, names]) => names.length > 1);
  const errors = [];

  for (const [number, names] of duplicates) {
    const allowed = ALLOWED_DUPLICATE_GROUPS.get(number);
    if (!allowed) {
      errors.push(`Unexpected duplicate prefix ${number}: ${names.join(', ')}`);
      continue;
    }

    const normalizedActual = [...names].sort();
    const normalizedExpected = [...allowed].sort();

    if (
      normalizedActual.length !== normalizedExpected.length ||
      normalizedActual.some((name, index) => name !== normalizedExpected[index])
    ) {
      errors.push(
        `Duplicate prefix ${number} does not match allowlist. Found: ${normalizedActual.join(', ')} | Expected: ${normalizedExpected.join(', ')}`
      );
    }
  }

  return {
    duplicateCount: duplicates.length,
    errors,
  };
}

module.exports = {
  validateDuplicateGroups,
};

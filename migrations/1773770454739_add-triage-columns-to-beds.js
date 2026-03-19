exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.addColumns('beds', {
        patient_uhid: { type: 'varchar(100)' },
        patient_name: { type: 'varchar(255)' },
        key_symptom: { type: 'text' },
        triage_category: { type: 'varchar(50)' },
    });
};

exports.down = (pgm) => {
    pgm.dropColumns('beds', [
        'patient_uhid',
        'patient_name',
        'key_symptom',
        'triage_category',
    ]);
};

const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function seedErIntake(nurseId) {
  const bedResult = await client.query(
    `SELECT id FROM beds ORDER BY bed_number LIMIT 3`
  );

  for (const [index, bed] of bedResult.rows.entries()) {
    await client.query(
      `INSERT INTO er_intake (
         bed_id, patient_uhid, symptom, complaint, triage_level, registered_by_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        bed.id,
        `METRIC-UHID-${index + 1}`,
        ['Chest pain', 'Fever', 'Trauma'][index],
        'Seeded metric intake record',
        ['URGENT', 'MEDIUM', 'HIGH'][index],
        nurseId,
      ]
    );
  }
}

async function seedOtProcedures() {
  const roomResult = await client.query(
    `SELECT id FROM ot_rooms ORDER BY room_number LIMIT 4`
  );

  for (const [index, room] of roomResult.rows.entries()) {
    const isActive = index % 2 === 0;
    await client.query(
      `INSERT INTO ot_procedures (
         ot_id, procedure_name, surgeon_id, actual_start_time,
         actual_finish_time, duration_minutes, status
       )
       VALUES (
         $1, $2, NULL, NOW() - ($3::int * INTERVAL '30 minutes'),
         CASE WHEN $4 THEN NULL ELSE NOW() END,
         CASE WHEN $4 THEN NULL ELSE GREATEST(1, $3::int * 30) END,
         CASE WHEN $4 THEN 'IN_PROGRESS' ELSE 'COMPLETED' END
       )`,
      [room.id, ['Appendectomy', 'Debridement', 'Laparotomy', 'Wound closure'][index], index + 1, isActive]
    );
  }
}

async function seedCathLabProcedures(cardiologistId) {
  const procedures = [
    ['CAG', 'METRIC-CATH-1', 75, 'Completed diagnostic angiography'],
    ['PTCA', 'METRIC-CATH-2', 110, 'Stent placed successfully'],
    ['CAG', 'METRIC-CATH-3', 60, 'No critical stenosis found'],
  ];

  for (const [procedureType, patientUhid, minutes, outcome] of procedures) {
    await client.query(
      `INSERT INTO cath_lab_procedures (
         procedure_type, patient_uhid, cardiologist_id,
         actual_start_time, actual_end_time, duration_minutes, outcome, status
       )
       VALUES (
         $1, $2, $3,
         NOW() - ($4::int * INTERVAL '1 minute'),
         NOW(),
         $4,
         $5,
         'COMPLETED'
       )`,
      [procedureType, patientUhid, cardiologistId, minutes, outcome]
    );
  }
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  await client.connect();
  try {
    const nurse = await client.query(
      `SELECT id FROM users WHERE role = 'nurse' AND is_active = true ORDER BY created_at LIMIT 1`
    );
    const cardiologist = await client.query(
      `SELECT id FROM users WHERE role = 'cardiologist' AND is_active = true ORDER BY created_at LIMIT 1`
    );

    if (nurse.rows[0]) {
      await seedErIntake(nurse.rows[0].id);
    } else {
      console.warn('Skipping ER intake metrics: no active nurse user found.');
    }

    await seedOtProcedures();

    if (cardiologist.rows[0]) {
      await seedCathLabProcedures(cardiologist.rows[0].id);
    } else {
      console.warn('Skipping cath lab metrics: no active cardiologist user found.');
    }

    console.log('Seeded metrics using current schemas.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

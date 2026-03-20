import { query } from 'pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const bedRes = await pool.query('SELECT id FROM beds LIMIT 1');
    const bId = bedRes.rows[0]?.id;

    const userRes = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['doctor']);
    const dId = userRes.rows[0]?.id;

    if (!bId || !dId) {
       console.log("No beds or doctors found");
       process.exit(0);
    }

    console.log("Submitting test diagnosis with bedId:", bId, "doctorId:", dId);

    const result = await pool.query(
      `INSERT INTO diagnosis (
         bed_id, patient_uhid, doctor_id,
         symptoms_observed, diagnosis_text, diagnosis_code,
         severity, recommended_action, diagnosed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        bId,
        "UHID-12345",
        dId,
        "Headache",
        "Migraine",
        "",
        "MILD",
        "Rest"
      ]
    );
    console.log("Success! Inserted:", result.rows[0]);
  } catch (err) {
    console.error("FAILED TO INSERT:", err);
  } finally {
    process.exit(0);
  }
}

run();

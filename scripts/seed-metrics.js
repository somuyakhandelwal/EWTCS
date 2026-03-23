const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:12aditi95@localhost:5432/ewtcs'
});

async function run() {
  await client.connect();

  await client.query(`
    INSERT INTO er_intake (occupancy_status, triage_time_minutes) VALUES
    ('occupied', 15), ('occupied', 25), ('vacant', 0), ('occupied', 20), ('occupied', 10), ('vacant', 0), ('occupied', 30);
  `);
  
  await client.query(`
    INSERT INTO ot_procedures (patient_name, status, room_id) VALUES
    ('John Doe', 'in_progress', 'OT-1'),
    ('Jane Smith', 'completed', 'OT-2'),
    ('Alice Williams', 'in_progress', 'OT-3'),
    ('Bob Brown', 'completed', 'OT-1');
  `);
  
  await client.query(`
    INSERT INTO cath_lab_procedures (procedure_type, status) VALUES
    ('CAG', 'active'), ('PTCA', 'completed'), ('CAG', 'completed'), ('PTCA', 'active'), ('CAG', 'active');
  `);
  
  console.log('Seeded metrics tables!');
  await client.end();
}
run().catch(console.error);

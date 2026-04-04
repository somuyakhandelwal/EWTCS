const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:12aditi95@localhost:5432/ewtcs'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log(res.rows.map(r => r.table_name));
  await client.end();
}
run().catch(console.error);

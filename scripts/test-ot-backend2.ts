import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function test() {
  const client = await pool.connect()
  try {
    const res = await client.query('SELECT r.id as room_id, r.status, u.id as user_id FROM ot_rooms r CROSS JOIN users u WHERE u.role = $1 LIMIT 1', ['doctor'])
    if (res.rows.length === 0) { console.log('no data'); return; }
    
    const { room_id, status, user_id } = res.rows[0]
    
    await client.query('BEGIN')
    
    await client.query(
        `UPDATE ot_rooms
         SET status = $1::text::ot_room_status,
             started_at = CASE WHEN $1::text = 'ongoing' THEN NOW() ELSE NULL END,
             updated_by = $2,
             updated_at = NOW()
         WHERE id = $3`,
        ['ongoing', user_id, room_id]
    )
    await client.query('ROLLBACK')
    console.log('Success!')
    
  } catch (e) {
    console.error('Error:', e)
  } finally {
    client.release()
    await pool.end()
  }
}
test()

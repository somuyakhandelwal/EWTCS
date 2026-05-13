import { config } from 'dotenv'
config({ path: '.env.local' })
import { getOTRooms, updateOTRoomStatus } from '../src/features/ot-dashboard/actions/ot-actions'
import pool from '../src/shared/lib/db'

async function main() {
  const rooms = await getOTRooms()
  if (!rooms.data || rooms.data.rooms.length === 0) {
    console.log("No rooms")
    process.exit(0)
  }
  const room = rooms.data.rooms[0]
  const roomId = room.id
  console.log("Testing on room", room.roomNumber, "Status:", room.status)
  
  if (room.status === 'available') {
    console.log("Marking ongoing")
    const r1 = await updateOTRoomStatus({roomId, status: 'ongoing', procedureName: 'Test proc'})
    console.log(r1)
    
    // pretend we wait 1 sec
    await new Promise(r => setTimeout(r, 1000))
    console.log("Marking available")
    const r2 = await updateOTRoomStatus({roomId, status: 'available'})
    console.log(r2)
  } else {
    console.log("Marking available")
    const r2 = await updateOTRoomStatus({roomId, status: 'available'})
    console.log(r2)
  }
  
  await pool.end()
}
main()

// Bed Database Queries - Epic 1: Nurse Desk Bed Dashboard

// US-1.6: getBedsWithElapsedTime lives in bed-bottleneck-queries.ts (200-line limit)
export { getBedsWithElapsedTime } from './bed-bottleneck-queries'

// Bed read queries
export { getAllBeds, getBedById, getBedByNumber } from './bed-read-queries'

// Bed access and ward authorization queries
export {
  getBedAccessInfo,
  getBedWard,
  getUserWard,
  checkWardAccess,
} from './bed-access-queries'

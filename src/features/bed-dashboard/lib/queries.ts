// Bed Dashboard Database Queries - Index
// Epic 1: Nurse Desk Bed Dashboard
// Re-exports all queries for backward compatibility

export { getAllStages, getStageById } from './stage-queries'
export {
  getAllBeds,
  getBedsWithElapsedTime,
  getBedById,
  getBedByNumber,
} from './bed-queries'

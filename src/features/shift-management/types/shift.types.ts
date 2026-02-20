// Shift Management Types (US-8.1, US-8.2)
// Epic 8: Shift Management

export interface Shift {
  id: string
  name: string
  /** Wall-clock start time as stored string, e.g. "06:00:00" */
  start_time: string
  /** Wall-clock end time as stored string, e.g. "14:00:00" */
  end_time: string
  /**
   * Whether this shift crosses midnight (start_time > end_time).
   * Computed in the query layer; not a DB column.
   */
  crosses_midnight: boolean
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateShiftInput {
  name: string
  /** HH:MM format */
  start_time: string
  /** HH:MM format */
  end_time: string
}

export interface UpdateShiftInput {
  id: string
  name?: string
  /** HH:MM format */
  start_time?: string
  /** HH:MM format */
  end_time?: string
  is_active?: boolean
}

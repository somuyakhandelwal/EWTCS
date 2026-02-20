// Shared action result type for bed-management server actions
// Epic 6: Bed & Workflow Configuration
// Centralised here to eliminate duplication across bed-crud-actions,
// bed-status-actions, temporary-bed-actions, and virtual-bed-actions.

/**
 * Standard return shape for all bed-management server actions.
 * @template T - Shape of the optional `data` payload on success
 */
export type ActionResult<T = unknown> = {
    success: boolean
    data?: T
    error?: string
}

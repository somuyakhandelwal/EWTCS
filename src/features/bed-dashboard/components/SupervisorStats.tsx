import { BedGridStats } from './BedGridStats'

/**
 * Props for the SupervisorStats component.
 * @property stats - The aggregated statistics for the bed grid.
 * @property bottleneckCount - The number of beds currently in a disposition bottleneck state.
 */
interface SupervisorStatsProps {
    stats: {
        total: number
        occupied: number
        available: number
        delayed: number
    }
    bottleneckCount: number
}

/**
 * SupervisorStats Component
 * 
 * Displays key metrics for the supervisor dashboard, including:
 * - Total beds
 * - Occupied beds
 * - Available beds
 * - Delayed beds (priority focus)
 * - Bottleneck count (disposition delays)
 * 
 * This component acts as a specialized wrapper around the generic BedGridStats
 * to provide a supervisor-specific context and potentially simplified prop interface.
 */
export function SupervisorStats({ stats, bottleneckCount }: SupervisorStatsProps) {
    return (
        <BedGridStats
            total={stats.total}
            occupied={stats.occupied}
            available={stats.available}
            delayed={stats.delayed}
            bottleneckCount={bottleneckCount}
        />
    )
}

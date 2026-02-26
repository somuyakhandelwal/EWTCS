interface BedStatisticsBarProps {
    activeCount: number
    inactiveCount: number
    showingCount: number
}

/**
 * Statistics bar showing active, inactive, and filtered bed counts
 */
export function BedStatisticsBar({ 
    activeCount, 
    inactiveCount, 
    showingCount 
}: BedStatisticsBarProps) {
    return (
        <div className="flex gap-4 text-sm">
            <div className="px-3 py-1 bg-green-900/20 border border-green-800 rounded-md">
                <span className="text-green-400 font-medium">{activeCount}</span>{' '}
                <span className="text-muted-foreground">Active</span>
            </div>
            <div className="px-3 py-1 bg-red-900/20 border border-red-800 rounded-md">
                <span className="text-red-400 font-medium">{inactiveCount}</span>{' '}
                <span className="text-muted-foreground">Inactive</span>
            </div>
            <div className="px-3 py-1 bg-blue-900/20 border border-blue-800 rounded-md">
                <span className="text-blue-400 font-medium">{showingCount}</span>{' '}
                <span className="text-muted-foreground">Showing</span>
            </div>
        </div>
    )
}

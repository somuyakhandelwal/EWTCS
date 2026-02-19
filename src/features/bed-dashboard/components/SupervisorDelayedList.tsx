import { BedCard } from './BedCard'
import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { BedWithElapsedTime } from '../types/bed'

interface SupervisorDelayedListProps {
    delayedBeds: BedWithElapsedTime[]
    isRefreshing: boolean
    onRefresh: () => void
    onBedClick: (bedId: string, bedNumber: string) => void
}

/**
 * Subcomponent: Provides filtering and sorting options for the delayed bed list.
 */
function SupervisorToolbar({
    isRefreshing,
    onRefresh,
    totalDelayed
}: {
    isRefreshing: boolean
    onRefresh: () => void
    totalDelayed: number
}) {
    return (
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-4">
            <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Priority Attention Required ({totalDelayed})
                </h2>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Updating...' : 'Refresh Data'}
                </Button>
            </div>
        </div>
    )
}

/**
 * Subcomponent: Renders the grid of bed cards for delayed items.
 */
function DelayedBedGrid({
    delayedBeds,
    onBedClick
}: {
    delayedBeds: BedWithElapsedTime[]
    onBedClick: (id: string, num: string) => void
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {delayedBeds.map(bed => (
                <BedCard
                    key={bed.id}
                    bed={bed}
                    onClick={() => onBedClick(bed.id, bed.bedNumber)}
                    onViewHistory={() => onBedClick(bed.id, bed.bedNumber)}
                    errorMessage={null}
                />
            ))}
        </div>
    )
}

/**
 * SupervisorDelayedList Component
 * 
 * Renders the list of delayed beds or an empty state message.
 * Orchestrates the toolbar and grid display.
 */
export function SupervisorDelayedList({
    delayedBeds,
    isRefreshing,
    onRefresh,
    onBedClick
}: SupervisorDelayedListProps) {
    if (delayedBeds.length === 0) {
        return (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 py-12 text-center flex flex-col items-center justify-center gap-2">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                    <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-white">All Clear</h3>
                <p className="text-sm text-zinc-400 max-w-sm">
                    No delays reported. All active beds are within their target stage durations.
                </p>
                <Button variant="link" onClick={onRefresh} disabled={isRefreshing} className="mt-2 text-zinc-500 hover:text-white">
                    Check for updates
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <SupervisorToolbar
                isRefreshing={isRefreshing}
                onRefresh={onRefresh}
                totalDelayed={delayedBeds.length}
            />

            <DelayedBedGrid
                delayedBeds={delayedBeds}
                onBedClick={onBedClick}
            />

            <div className="text-center pt-4">
                <p className="text-xs text-zinc-600">
                    Displaying {delayedBeds.length} flagged items based on current configurations.
                </p>
            </div>
        </div>
    )
}

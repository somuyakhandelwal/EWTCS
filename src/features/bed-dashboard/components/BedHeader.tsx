import { cn } from '@/shared/lib/utils'

/**
 * Subcomponent: Renders the Bed Number and Occupancy Pulse
 */
export function BedHeader({ bedNumber, isOccupied, isDelayed, colorClasses }: {
    bedNumber: string,
    isOccupied: boolean,
    isDelayed: boolean,
    colorClasses: { text: string }
}) {
    return (
        <div className="flex items-center justify-between">
            <h3 className={cn('text-2xl font-bold', colorClasses.text)}>
                {bedNumber}
            </h3>
            {isOccupied && !isDelayed && (
                <div className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
            )}
        </div>
    )
}

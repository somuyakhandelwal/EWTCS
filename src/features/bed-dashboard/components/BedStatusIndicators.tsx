import { AlertTriangle, Hourglass } from 'lucide-react'

/**
 * Subcomponent: Renders the visual indicators (icons) for delays and bottlenecks
 * positioned absolutely within the card.
 */
export function BedStatusIndicators({ isDelayed, isBottleneck }: { isDelayed: boolean, isBottleneck: boolean }) {
    return (
        <>
            {/* General Delay Indicator */}
            {isDelayed && !isBottleneck && (
                <div className="absolute top-2 right-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
            )}

            {/* Disposition Bottleneck Indicator */}
            {isBottleneck && (
                <div className="absolute top-2 right-2">
                    <Hourglass className="h-5 w-5 text-amber-400" />
                </div>
            )}
        </>
    )
}

import { MapPin, Zap, AlertTriangle, Hourglass } from 'lucide-react'

interface BedCardVisualBadgesProps {
    isVirtual: boolean
    isTemporary: boolean
    isEscalated: boolean
    isDelayed: boolean
    isBottleneck: boolean
    acknowledged: boolean
}

export function BedCardVisualBadges({
    isVirtual,
    isTemporary,
    isEscalated,
    isDelayed,
    isBottleneck,
    acknowledged,
}: BedCardVisualBadgesProps) {
    return (
        <>
            {/* Visual badges with screen reader descriptions */}
            {isVirtual && (
                <div className="absolute top-0 left-0 flex items-center gap-0.5 rounded-br bg-purple-700/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-100">
                    <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                    Virtual
                </div>
            )}
            {isTemporary && !isVirtual && (
                <div className="absolute top-0 left-0 flex items-center gap-0.5 rounded-br bg-orange-700/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-100">
                    <Zap className="h-2.5 w-2.5" aria-hidden="true" />
                    Surge
                </div>
            )}
            {isEscalated && !isBottleneck && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <AlertTriangle className="h-5 w-5 text-fuchsia-500" aria-hidden="true" />
                    <span className="sr-only">Escalated Alert</span>
                </div>
            )}
            {isDelayed && !isEscalated && !isBottleneck && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
                    <span className="sr-only">Delayed Alert</span>
                </div>
            )}
            {isDelayed && acknowledged && (
                <div className="absolute top-2 left-2">
                    <span className="text-[9px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">Acknowledged</span>
                </div>
            )}
            {isBottleneck && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Hourglass className="h-5 w-5 text-amber-400" aria-hidden="true" />
                    <span className="sr-only">Bottleneck Alert</span>
                </div>
            )}
        </>
    )
}

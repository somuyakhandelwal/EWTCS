import { Zap, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { BedCard } from './BedCard'
import type { BedWithElapsedTime } from '../types/bed'

interface SurgeBedsSectionProps {
    temporaryBeds: BedWithElapsedTime[]
    onAddTempBed?: () => void
    onRemoveTempBed?: (bedId: string) => Promise<void>
    isRemovingId?: string | null
}

export function SurgeBedsSection({
    temporaryBeds,
    onAddTempBed,
    onRemoveTempBed,
    isRemovingId,
}: SurgeBedsSectionProps) {
    return (
        <div className="rounded-lg border border-orange-900/50 bg-orange-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-300 uppercase tracking-wider">
                    <Zap className="h-4 w-4 text-orange-400" />
                    Surge Capacity
                    {temporaryBeds.length > 0 && (
                        <span className="ml-1 rounded-full bg-orange-800/60 px-2 py-0.5 text-[10px] font-bold text-orange-200">
                            {temporaryBeds.length} active
                        </span>
                    )}
                </h2>
                {onAddTempBed && (
                    <Button
                        size="sm"
                        onClick={onAddTempBed}
                        className="bg-orange-700 hover:bg-orange-600 text-white border-none h-8 text-xs"
                    >
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Add Temporary Bed
                    </Button>
                )}
            </div>

            {temporaryBeds.length === 0 ? (
                <p className="text-sm text-zinc-500">
                    No temporary beds active. Use &ldquo;Add Temporary Bed&rdquo; during surge.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {temporaryBeds.map(bed => (
                        <div key={bed.id} className="relative">
                            <BedCard bed={bed} />
                            {/* Remove button — only when bed is empty */}
                            {!bed.isOccupied && onRemoveTempBed && (
                                <button
                                    type="button"
                                    disabled={isRemovingId === bed.id}
                                    onClick={() => onRemoveTempBed(bed.id)}
                                    className="absolute top-2 right-2 flex items-center gap-1 rounded bg-red-900/60 border border-red-700/50 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 hover:bg-red-800/80 transition-colors disabled:opacity-50"
                                    title="Remove temporary bed"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

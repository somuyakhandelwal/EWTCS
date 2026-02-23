// Virtual Beds Section — US-6.6
// Extracted from SupervisorBedOverview to respect the 200-line file limit.

import { MapPin, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { BedCard } from './BedCard'
import type { BedWithElapsedTime } from '../types/bed'

interface VirtualBedsSectionProps {
    virtualBeds: BedWithElapsedTime[]
    onAddVirtualBed?: () => void
    onRemoveVirtualBed?: (bedId: string) => Promise<void>
}

export function VirtualBedsSection({
    virtualBeds,
    onAddVirtualBed,
    onRemoveVirtualBed,
}: VirtualBedsSectionProps) {
    return (
        <div className="rounded-lg border border-purple-900/50 bg-purple-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-purple-300 uppercase tracking-wider">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    Hallway / Stretchers
                    {virtualBeds.length > 0 && (
                        <span className="ml-1 rounded-full bg-purple-800/60 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                            {virtualBeds.length} active
                        </span>
                    )}
                </h2>
                {onAddVirtualBed && (
                    <Button
                        size="sm"
                        onClick={onAddVirtualBed}
                        className="bg-purple-700 hover:bg-purple-600 text-white border-none h-8 text-xs"
                    >
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        Add Virtual Bed
                    </Button>
                )}
            </div>

            {virtualBeds.length === 0 ? (
                <p className="text-sm text-zinc-500">
                    No virtual beds active. Use &ldquo;Add Virtual Bed&rdquo; to track hallway patients.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {virtualBeds.map(bed => (
                        <div key={bed.id} className="relative">
                            <BedCard bed={bed} viewMode="supervisor" />
                            {!bed.isOccupied && onRemoveVirtualBed && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveVirtualBed(bed.id)}
                                    className="absolute top-2 right-2 flex items-center gap-1 rounded bg-red-900/60 border border-red-700/50 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 hover:bg-red-800/80 transition-colors"
                                    title="Remove virtual bed"
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

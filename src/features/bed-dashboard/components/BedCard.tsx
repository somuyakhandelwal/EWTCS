import { memo, useState, useEffect, useCallback, type MouseEvent } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Clock, Stethoscope } from 'lucide-react'
import { getStageColorClasses, getDelayColorClasses } from '../lib/utils'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { CleaningActions, isCleaningStage } from './CleaningActions'
import { BedBottleneckInfo } from './BedBottleneckInfo'
import { BedCardVisualBadges } from './BedCardVisualBadges'
import { BedCardUndoSection } from './BedCardUndoSection'
import { BedTriageInfo } from './BedTriageInfo'
import { highlightMatch } from '../lib/highlight-match'
import { StageIcon } from './StageIcon'
import { DiagnosisPanel } from '@/features/diagnosis/components/DiagnosisPanel'
import { BedCardTimers } from './BedCardTimers'
import { cn } from '@/shared/lib/utils'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
const ACKNOWLEDGE_PAUSE_MS = 30_000
export type BedCardViewMode = 'nurse' | 'supervisor' // 'nurse' = In Stage timer only; 'supervisor' = In Stage + Patient Total
/**
 * BedCard component: EPIC 1, EPIC 6, EPIC 22
 * Renders a single bed's status, patient info, and clinical actions.
 */
interface BedCardProps {
  /** The bed data object, enriched with elapsed time information */
  bed: BedWithElapsedTime
  /** Click handler for the whole card */
  onClick?: (bed: BedWithElapsedTime) => void
  /** Context menu handler for stage transition overrides */
  onContextMenu?: (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => void
  /** Callback for when a disposition delay reason is selected */
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
  /** Visual flag to highlight recent updates */
  showUpdated?: boolean
  /** Error message specific to this bed (e.g., sync failed) */
  errorMessage?: string | null
  /** Search query string for highlighting matches in patient ID or bed name */
  searchQuery?: string
  /** Whether to show the "Undo" action for the last transition */
  showUndo?: boolean
  /** Callback for when the user clicks "Undo" */
  onUndo?: () => void
  /** Remaining seconds for the undo grace period */
  undoTimerSeconds?: number
  /** Whether the "Undo" operation is currently in flight */
  isUndoing?: boolean
  /** US-4.3: Disable animation globally (accessibility setting) */
  animationEnabled?: boolean
  /** Controls which timers are shown. Defaults to 'nurse'. */
  viewMode?: BedCardViewMode
  /** Whether the system is in offline mode */
  isOffline?: boolean
  /** US-16.2: true when this bed has a write queued for offline sync */
  isQueuedOffline?: boolean
  /** EPIC 22: Nurse role diagnosis display (read-only) */
  onOpenDiagnosis?: (bedId: string) => void
  /** EPIC 22: Doctor role diagnosis entry */
  onOpenDoctorDiagnosis?: (bedId: string) => void
  /** Current user role - used for role-based button visibility (EPIC 22) */
  role?: string
}
export const BedCard = memo(function BedCard({
  bed, onClick, onContextMenu, onReasonSelect, showUpdated = false, errorMessage = null,
  searchQuery = '', showUndo = false, onUndo, undoTimerSeconds, animationEnabled = true,
  isUndoing = false, isOffline = false, isQueuedOffline, onOpenDiagnosis, onOpenDoctorDiagnosis, role,
}: BedCardProps) {
  const rawStageName = bed.currentStage?.name || 'Empty'
  const stageName = rawStageName === 'Cleaning' ? 'In Cleaning' : rawStageName
  const stageColor = bed.currentStage?.colorCode || 'gray'
  const colorClasses = bed.isDelayed ? getDelayColorClasses(true) : getStageColorClasses(stageColor)
  const { isOccupied, isDelayed, isDispositionBottleneck: isBottleneck, isEscalated } = bed
  const isCleaning = isCleaningStage(bed.currentStage?.name)
  const isTemporary = bed.isTemporary
  const isVirtual = bed.isVirtual
  // US-4.3: Acknowledge — pauses animation for 30s, resumes if still delayed
  const [acknowledged, setAcknowledged] = useState(false)
  useEffect(() => { if (!isDelayed) setAcknowledged(false) }, [isDelayed])
  useEffect(() => {
    if (!acknowledged) return
    const t = setTimeout(() => { if (isDelayed) setAcknowledged(false) }, ACKNOWLEDGE_PAUSE_MS)
    return () => clearTimeout(t)
  }, [acknowledged, isDelayed])
  const handleClick = useCallback(() => {
    if (isDelayed && !acknowledged) setAcknowledged(true)
    onClick?.(bed)
  }, [isDelayed, acknowledged, onClick, bed])
  const showPulse = animationEnabled && !acknowledged
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Bed ${bed.bedNumber}, ${stageName}${isOccupied ? ', Occupied' : ', Available'}${isDelayed ? ', Delayed' : ''}${isEscalated ? ', Escalated' : ''}${isBottleneck ? ', Disposition Bottleneck' : ''}`}
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer sm:hover:scale-105 sm:hover:shadow-lg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        colorClasses.bg,
        colorClasses.border,
        'border-2',
        isVirtual && 'ring-2 ring-status-virtual border-status-virtual',
        isTemporary && !isVirtual && 'ring-2 ring-status-temporary border-status-temporary',
        isDelayed && !isEscalated && 'ring-2 ring-destructive',
        isDelayed && !isEscalated && showPulse && 'animate-pulse-slow',
        isEscalated && 'ring-2 ring-status-escalated animate-glow-escalated',
        isBottleneck && !isDelayed && !isEscalated && 'ring-2 ring-status-cleaning',
        isBottleneck && !isDelayed && !isEscalated && showPulse && 'animate-pulse-slow',
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onContextMenu={(e) => onContextMenu?.(e, bed)}
    >
      <BedCardVisualBadges
        isVirtual={isVirtual}
        isTemporary={isTemporary}
        isEscalated={isEscalated}
        isDelayed={isDelayed}
        isBottleneck={isBottleneck}
        acknowledged={acknowledged}
      />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={cn('text-2xl font-bold', colorClasses.text)}>
            {highlightMatch(bed.bedNumber, searchQuery)}
          </h3>
          {isOccupied && !isDelayed && (
            <div className="flex h-2 w-2" role="status" aria-label="Occupied active indicator">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Stage</p>
          <div className="flex items-center gap-1.5">
            <StageIcon colorCode={stageColor} className={cn('h-4 w-4', colorClasses.text)} />
            <p className={cn('text-sm font-semibold', colorClasses.text)}>{highlightMatch(stageName, searchQuery)}</p>
          </div>
          {onContextMenu && <p className="text-[10px] text-muted-foreground">Tap or right-click to update stage</p>}
          {showUpdated && <p className="text-[10px] text-status-occupied" role="status">Updated</p>}
          {isQueuedOffline && (
            <p className="text-[10px] text-amber-500 font-medium" role="status" aria-label="Update queued — will sync when reconnected">
              ⏳ Pending sync
            </p>
          )}
          {errorMessage && <p className="text-[10px] text-destructive" role="alert">{errorMessage}</p>}
          {showUndo && onUndo && (
            <BedCardUndoSection
              show={showUndo}
              onUndo={onUndo}
              isUndoing={isUndoing}
              timerSeconds={undoTimerSeconds}
            />
          )}
          {isBottleneck && (
            <BedBottleneckInfo
              bedId={bed.id}
              dispositionElapsedMs={bed.dispositionElapsedMs}
              dispositionDelayReason={bed.dispositionDelayReason}
              onReasonSelect={onReasonSelect}
            />
          )}
        </div>
        {isOccupied && (
          <BedCardTimers
            lastStageChange={bed.lastStageChange}
            patientStartTime={bed.patientStartTime}
            isDelayed={isDelayed}
          />
        )}
        {isCleaning && <CleaningActions lastStageChange={bed.lastStageChange} />}
        {!isOccupied && !isCleaning && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-medium text-muted-foreground">Available</p>
          </div>
        )}
        <BedTriageInfo triageInfo={bed.metadata?.triageInfo} />
        {/* EPIC 22: Doctor button (doctor role only, in occupied beds) */}
        {onOpenDiagnosis && role === 'doctor' && bed.isOccupied && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenDiagnosis(bed.id) }}
            className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            aria-label={`Record diagnosis for bed ${bed.bedNumber}`}
          >
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            Record Diagnosis
          </button>
        )}
        {/* EPIC 22: Diagnosis summary (visible to all appropriate roles) */}
        {bed.isOccupied && (
          <DiagnosisPanel bedId={bed.id} />
        )}
      </CardContent>
    </Card>
  )
})
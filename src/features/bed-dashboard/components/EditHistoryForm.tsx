'use client'

/**
 * EPIC 7 — EditHistoryForm
 * Extracted from EditHistoryModal to keep each file under 200 lines.
 * Renders: original record (read-only), editable stage/timestamp/notes, mandatory reason.
 */

import { Clock, FileText, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import type { AuditorHistoryRecord } from '../lib/auditor-history-queries'

export interface StageOption {
  id: string
  name: string
}

interface EditHistoryFormProps {
  record: AuditorHistoryRecord
  stages: StageOption[]
  toStageId: string
  notes: string
  transitionTime: string
  correctionReason: string
  formError: string | null
  onStageChange: (v: string) => void
  onNotesChange: (v: string) => void
  onTimeChange: (v: string) => void
  onReasonChange: (v: string) => void
}

export function EditHistoryForm({
  record, stages, toStageId, notes, transitionTime,
  correctionReason, formError,
  onStageChange, onNotesChange, onTimeChange, onReasonChange,
}: EditHistoryFormProps) {
  return (
    <div className="p-5 space-y-5 overflow-y-auto max-h-[72vh]">
      {/* AC 3: Original record — read-only */}
      <div className="bg-muted border border-border rounded-lg p-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Original Record (preserved — read-only)
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Transition</span>
          <span className="text-card-foreground flex items-center gap-1">
            {record.fromStageName ?? 'Admission'}
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            {record.toStageName}
          </span>
          <span className="text-muted-foreground">Timestamp</span>
          <span className="text-card-foreground font-mono">{new Date(record.transitionTime).toLocaleString()}</span>
          <span className="text-muted-foreground">Updated by</span>
          <span className="text-card-foreground">{record.changedByUsername}</span>
          <span className="text-muted-foreground">Notes</span>
          <span className="text-muted-foreground italic">{record.notes ? `"${record.notes}"` : '—'}</span>
        </div>
      </div>

      {/* Corrected "to" stage */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-card-foreground text-sm">
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          Corrected Stage (To)
        </Label>
        <select
          value={toStageId}
          onChange={(e) => onStageChange(e.target.value)}
          className="w-full rounded-md bg-muted border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Corrected timestamp */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-card-foreground text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          Corrected Timestamp
        </Label>
        <Input type="datetime-local" value={transitionTime}
          onChange={(e) => onTimeChange(e.target.value)}
          className="bg-muted border-border text-foreground" />
      </div>

      {/* Corrected notes */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-card-foreground text-sm">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Corrected Notes
        </Label>
        <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2}
          placeholder="Enter corrected notes (leave blank to clear)…"
          className="w-full rounded-md bg-muted border border-border text-foreground text-sm px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none" />
      </div>

      {/* AC 2: Mandatory correction reason */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm text-amber-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Correction Reason
          <span className="text-red-400 ml-0.5" aria-label="required">*</span>
        </Label>
        <textarea value={correctionReason} onChange={(e) => onReasonChange(e.target.value)} rows={2}
          placeholder="Required — explain why this correction is necessary…"
          className="w-full rounded-md bg-muted border border-amber-700/40 text-foreground text-sm px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none" />
        <p className="text-xs text-muted-foreground">
          Your supervisor ID and this reason are stored in the audit trail alongside the original data.
        </p>
      </div>

      {formError && (
        <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/60 rounded-lg p-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          {formError}
        </div>
      )}
    </div>
  )
}

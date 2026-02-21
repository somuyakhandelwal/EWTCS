'use client'

/**
 * EPIC 7 — EditHistoryForm
 * Extracted from EditHistoryModal to keep each file under 200 lines.
 * Renders: original record (read-only), editable stage/timestamp/notes, mandatory reason.
 * US-7.4: Reason dropdown with common reasons + free text "Other" option.
 */

import { Clock, FileText, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import type { AuditorHistoryRecord } from '../lib/auditor-history-queries'

const COMMON_REASONS = [
  'Data entry error',
  'Wrong stage selected',
  'System glitch / technical error',
  'Retrospective correction',
]

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

  const isCommonReason = COMMON_REASONS.includes(correctionReason)
  const dropdownValue = isCommonReason ? correctionReason : correctionReason ? 'Other' : ''

  function handleDropdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === 'Other') onReasonChange('')
    else onReasonChange(e.target.value)
  }

  return (
    <div className="p-5 space-y-5 overflow-y-auto max-h-[72vh]">
      {/* AC 3: Original record — read-only */}
      <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-lg p-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Original Record (preserved — read-only)
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <span className="text-zinc-500">Transition</span>
          <span className="text-zinc-200 flex items-center gap-1">
            {record.fromStageName ?? 'Admission'}
            <ArrowRight className="h-3 w-3 text-zinc-500" />
            {record.toStageName}
          </span>
          <span className="text-zinc-500">Timestamp</span>
          <span className="text-zinc-200 font-mono">{new Date(record.transitionTime).toLocaleString()}</span>
          <span className="text-zinc-500">Updated by</span>
          <span className="text-zinc-200">{record.changedByUsername}</span>
          <span className="text-zinc-500">Notes</span>
          <span className="text-zinc-400 italic">{record.notes ? `"${record.notes}"` : '—'}</span>
        </div>
      </div>

      {/* Corrected "to" stage */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-zinc-300 text-sm">
          <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
          Corrected Stage (To)
        </Label>
        <select
          value={toStageId}
          onChange={(e) => onStageChange(e.target.value)}
          className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Corrected timestamp */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-zinc-300 text-sm">
          <Clock className="h-3.5 w-3.5 text-zinc-500" />
          Corrected Timestamp
        </Label>
        <Input type="datetime-local" value={transitionTime}
          onChange={(e) => onTimeChange(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white" />
      </div>

      {/* Corrected notes */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-zinc-300 text-sm">
          <FileText className="h-3.5 w-3.5 text-zinc-500" />
          Corrected Notes
        </Label>
        <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2}
          placeholder="Enter corrected notes (leave blank to clear)…"
          className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none" />
      </div>

      {/* AC 2: Mandatory correction reason — US-7.4: dropdown + free text */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm text-amber-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Correction Reason
          <span className="text-red-400 ml-0.5" aria-label="required">*</span>
        </Label>
        <select
          value={dropdownValue}
          onChange={handleDropdownChange}
          className="w-full rounded-md bg-zinc-800 border border-amber-700/40 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="">— Select a reason —</option>
          {COMMON_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
          <option value="Other">Other (specify below)</option>
        </select>
        {(dropdownValue === 'Other' || (!isCommonReason && correctionReason === '')) && dropdownValue !== '' && (
          <textarea
            value={correctionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={2}
            placeholder="Required — explain why this correction is necessary…"
            className="w-full rounded-md bg-zinc-800 border border-amber-700/40 text-white text-sm px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          />
        )}
        <p className="text-xs text-zinc-500">
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
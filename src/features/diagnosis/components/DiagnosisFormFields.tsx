'use client'

import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { SEVERITY_OPTIONS } from '../schemas/diagnosis-schemas'
import type { SeverityType } from '../schemas/diagnosis-schemas'

const SEVERITY_LABELS: Record<SeverityType, string> = {
  MILD: '🟢 Mild',
  MODERATE: '🟡 Moderate',
  SEVERE: '🟠 Severe',
  CRITICAL: '🔴 Critical',
}

interface DiagnosisFormFieldsProps {
  patientUhid: string
  symptomsObserved: string
  diagnosisText: string
  diagnosisCode: string
  severity: SeverityType | ''
  recommendedAction: string
  isSubmitting: boolean
  onPatientUhidChange: (v: string) => void
  onSymptomsChange: (v: string) => void
  onDiagnosisTextChange: (v: string) => void
  onDiagnosisCodeChange: (v: string) => void
  onSeverityChange: (v: SeverityType) => void
  onRecommendedActionChange: (v: string) => void
}

export function DiagnosisFormFields({
  patientUhid,
  symptomsObserved,
  diagnosisText,
  diagnosisCode,
  severity,
  recommendedAction,
  isSubmitting,
  onPatientUhidChange,
  onSymptomsChange,
  onDiagnosisTextChange,
  onDiagnosisCodeChange,
  onSeverityChange,
  onRecommendedActionChange,
}: DiagnosisFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Patient UHID — editable if missing */}
      <div className="space-y-1">
        <Label htmlFor="diag-uhid" className="text-xs font-semibold uppercase tracking-wider">
          Patient UHID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="diag-uhid"
          value={patientUhid}
          onChange={(e) => onPatientUhidChange(e.target.value)}
          disabled={isSubmitting}
          required
          placeholder="Enter Patient UHID…"
          maxLength={50}
        />
      </div>

      {/* Symptoms Observed */}
      <div className="space-y-1">
        <Label htmlFor="diag-symptoms" className="text-xs font-semibold uppercase tracking-wider">
          Symptoms Observed
          <span className="ml-1 text-muted-foreground font-normal">(pre-filled from triage)</span>
        </Label>
        <Textarea
          id="diag-symptoms"
          value={symptomsObserved}
          onChange={(e) => onSymptomsChange(e.target.value)}
          disabled={isSubmitting}
          placeholder="Symptoms observed during examination…"
          maxLength={500}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Diagnosis Text — required */}
      <div className="space-y-1">
        <Label htmlFor="diag-text" className="text-xs font-semibold uppercase tracking-wider">
          Diagnosis <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="diag-text"
          value={diagnosisText}
          onChange={(e) => onDiagnosisTextChange(e.target.value)}
          disabled={isSubmitting}
          required
          placeholder="Clinical diagnosis…"
          maxLength={1000}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Severity — required */}
      <div className="space-y-1">
        <Label htmlFor="diag-severity" className="text-xs font-semibold uppercase tracking-wider">
          Severity <span className="text-destructive">*</span>
        </Label>
        <select
          id="diag-severity"
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as SeverityType)}
          disabled={isSubmitting}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select severity…</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* ICD Code — optional */}
      <div className="space-y-1">
        <Label htmlFor="diag-code" className="text-xs font-semibold uppercase tracking-wider">
          Diagnosis Code
          <span className="ml-1 text-muted-foreground font-normal">(ICD-10 — optional)</span>
        </Label>
        <Input
          id="diag-code"
          value={diagnosisCode}
          onChange={(e) => onDiagnosisCodeChange(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. J06.9"
          maxLength={20}
        />
      </div>

      {/* Recommended Action — optional */}
      <div className="space-y-1">
        <Label htmlFor="diag-action" className="text-xs font-semibold uppercase tracking-wider">
          Recommended Action
          <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="diag-action"
          value={recommendedAction}
          onChange={(e) => onRecommendedActionChange(e.target.value)}
          disabled={isSubmitting}
          placeholder="Next clinical steps…"
          maxLength={500}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  )
}

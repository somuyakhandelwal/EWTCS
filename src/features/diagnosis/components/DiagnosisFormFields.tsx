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

/**
 * Props for the DiagnosisFormFields component.
 */
interface DiagnosisFormFieldsProps {
  /** The patient's Unique Hospital Identity Number */
  patientUhid: string
  /** Observed symptoms (max 40 chars) */
  symptomsObserved: string
  /** The text of the diagnosis */
  diagnosisText: string
  /** Standardized diagnosis code (e.g., ICD-10) */
  diagnosisCode: string
  /** Severity level assigned by the doctor */
  severity: SeverityType | ''
  /** The doctor's recommended next clinical action */
  recommendedAction: string
  /** Whether the form is currently being submitted */
  isSubmitting: boolean
  /** Callback for patient UHID changes */
  onPatientUhidChange: (v: string) => void
  /** Callback for symptoms changes */
  onSymptomsChange: (v: string) => void
  /** Callback for diagnosis text changes */
  onDiagnosisTextChange: (v: string) => void
  /** Callback for diagnosis code changes */
  onDiagnosisCodeChange: (v: string) => void
  /** Callback for severity selection changes */
  onSeverityChange: (v: SeverityType) => void
  /** Callback for recommended action changes */
  onRecommendedActionChange: (v: string) => void
}

/**
 * Component for the form fields used in the DiagnosisModal.
 */
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

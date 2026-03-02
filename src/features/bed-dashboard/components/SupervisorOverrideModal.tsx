"use client"

import { useState, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import type { Stage } from "../types/bed"
import { getStageColorClasses } from '@/shared/utils/stage-colors'

interface SupervisorOverrideModalProps {
  isOpen: boolean
  bedNumber: string | null
  fromStageName: string | null
  toStage: Stage | null
  reason?: string | null
  onApprove: (reason: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function SupervisorOverrideModal({
  isOpen,
  bedNumber,
  fromStageName,
  toStage,
  reason,
  onApprove,
  onCancel,
  isLoading = false,
}: SupervisorOverrideModalProps) {
  const [overrideReason, setOverrideReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const colorClasses = getStageColorClasses(toStage?.colorCode)

  const handleApprove = useCallback(() => {
    if (!overrideReason.trim()) {
      setError("Please provide a reason for this override")
      return
    }

    if (overrideReason.length > 500) {
      setError("Reason must be 500 characters or less")
      return
    }

    setError(null)
    onApprove(overrideReason.trim())
    setOverrideReason("")
  }, [overrideReason, onApprove])

  const handleCancel = useCallback(() => {
    setOverrideReason("")
    setError(null)
    onCancel()
  }, [onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Transition Override Required</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This stage transition is irregular and requires a recorded reason.
          </p>
        </div>

        {/* Transition Details */}
        <div className="bg-muted rounded p-4 space-y-2 text-sm border border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bed:</span>
            <span className="font-medium text-foreground">{bedNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium text-foreground">{fromStageName || "Empty"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To:</span>
            <span className={`font-medium ${colorClasses.text}`}>
              {toStage?.name}
            </span>
          </div>
        </div>

        {reason && (
          <div className="bg-muted border border-border rounded p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1 text-foreground">Reason</p>
            <p>{reason}</p>
          </div>
        )}

        {/* Reason Input */}
        <div>
          <label htmlFor="override-reason" className="block text-sm font-medium text-foreground mb-2">
            Reason for Override <span className="text-destructive">*</span>
          </label>
          <textarea
            id="override-reason"
            value={overrideReason}
            onChange={(e) => {
              setOverrideReason(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Enter reason for transition override..."
            maxLength={500}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm text-foreground resize-none disabled:opacity-50 placeholder:text-muted-foreground"
            rows={3}
          />
          <div className="flex justify-between mt-1">
            <div className="text-xs text-muted-foreground">
              {error && <span className="text-destructive">{error}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {overrideReason.length}/500
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-muted/50 border border-border rounded p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1 text-foreground">⚠️ Important</p>
          <p>This action will be logged and audited. Approvals require valid justification.</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            loading={isLoading}
            disabled={!overrideReason.trim()}
            className="flex-1"
          >
            Approve
          </Button>
        </div>
      </div>
    </div>
  )
}

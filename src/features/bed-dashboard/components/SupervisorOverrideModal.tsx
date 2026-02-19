"use client"

import { useState, useCallback } from "react"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Supervisor Approval Required</h2>
          <p className="text-sm text-gray-600 mt-1">
            This stage transition requires supervisor approval
          </p>
        </div>

        {/* Transition Details */}
        <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Bed:</span>
            <span className="font-medium text-gray-900">{bedNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">From:</span>
            <span className="font-medium text-gray-900">{fromStageName || "Empty"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">To:</span>
            <span className={`font-medium ${colorClasses.text}`}>
              {toStage?.name}
            </span>
          </div>
        </div>

        {reason && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">Reason</p>
            <p>{reason}</p>
          </div>
        )}

        {/* Reason Input */}
        <div>
          <label htmlFor="override-reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Override <span className="text-red-600">*</span>
          </label>
          <textarea
            id="override-reason"
            value={overrideReason}
            onChange={(e) => {
              setOverrideReason(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Enter reason for supervisor approval..."
            maxLength={500}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none disabled:bg-gray-50 disabled:text-gray-500"
            rows={3}
          />
          <div className="flex justify-between mt-1">
            <div className="text-xs text-gray-500">
              {error && <span className="text-red-600">{error}</span>}
            </div>
            <div className="text-xs text-gray-500">
              {overrideReason.length}/500
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          <p className="font-medium mb-1">⚠️ Important</p>
          <p>This action will be logged and audited. Approvals require valid justification.</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-500 font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isLoading || !overrideReason.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 font-medium text-sm"
          >
            {isLoading ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  )
}

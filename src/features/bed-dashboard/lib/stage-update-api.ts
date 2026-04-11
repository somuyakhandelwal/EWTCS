type StageUpdateApiResponse = {
  success: boolean
  data?: {
    isOccupied: boolean
    patientStartTime: Date | string | null
    lastStageChange: Date | string | null
  }
  error?: string
  reason?: string
  requiresOverride?: boolean
}

export async function submitBedStageUpdate(input: {
  bedId: string
  toStageId: string
  supervisorOverride?: boolean
  overrideReason?: string
}): Promise<StageUpdateApiResponse> {
  const response = await fetch('/api/bed-stage/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  })

  const result = (await response.json()) as StageUpdateApiResponse
  if (!response.ok) {
    return {
      success: false,
      error: result.error || 'Failed to update stage',
      reason: result.reason,
      requiresOverride: result.requiresOverride,
    }
  }

  return result
}

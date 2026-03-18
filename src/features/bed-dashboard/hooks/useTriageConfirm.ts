import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BedWithElapsedTime, Stage, BedGridData } from '../types/bed'
import type { TriageState } from './useBedStageUpdate'

interface UseTriageConfirmProps {
  setTemporaryError: (bedId: string, error: string) => void
  setData: React.Dispatch<React.SetStateAction<BedGridData>>
}

export function useTriageConfirm({ setTemporaryError, setData }: UseTriageConfirmProps) {
  const router = useRouter()
  const [triageState, setTriageState] = useState<TriageState | null>(null)

  const openTriageModal = useCallback((bed: BedWithElapsedTime, stage: Stage) => {
    setTriageState({ bed, stage })
  }, [])

  const closeTriageModal = useCallback(() => {
    setTriageState(null)
  }, [])

  const handleTriageSubmit = useCallback(async (bedId: string, triageData: {
    patientUhid: string;
    patientIpdId?: string | null;
    patientName: string;
    patientAge: number;
    patientGender: 'Male' | 'Female' | 'Other' | 'Unknown';
    keySymptom: string;
    triageCategory: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent';
  }, performStageUpdate: (bedId: string, stageId: string) => Promise<boolean>) => {
    if (!triageState) return
    const { updateBedTriageInfo } = await import('../actions/triage-actions') // Lazy load
    const result = await updateBedTriageInfo(bedId, triageData)
    
    if (result.success) {
      // Optimistically update the local triage data
      setData((prev) => ({
        ...prev,
        beds: prev.beds.map((b) =>
          b.id === bedId
            ? { ...b, metadata: { ...b.metadata, triageInfo: triageData } }
            : b
        )
      }))

      if (triageState.stage.id !== triageState.bed.currentStageId) {
        await performStageUpdate(bedId, triageState.stage.id)
      } else {
         router.refresh()
      }
    } else {
      setTemporaryError(bedId, result.error || 'Failed to save triage info')
    }
  }, [triageState, router, setTemporaryError, setData])

  return { triageState, openTriageModal, closeTriageModal, handleTriageSubmit }
}

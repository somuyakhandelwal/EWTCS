import { cn } from '@/shared/lib/utils'

interface BedTriageInfoProps {
  triageInfo?: {
    patientUhid?: string
    patientName?: string
    keySymptom?: string
    triageCategory?: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent'
  }
}

export function BedTriageInfo({ triageInfo }: BedTriageInfoProps) {
  if (!triageInfo?.triageCategory && !triageInfo?.patientName) return null

  const getTriageColor = (category?: string) => {
    switch (category) {
      case 'Resuscitation': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
      case 'Emergent': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
      case 'Urgent': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'
      case 'Less Urgent': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
      case 'Non-Urgent': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
    }
  }

  return (
    <div className="pt-2 mt-2 border-t border-border/50 text-xs">
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        {triageInfo.triageCategory && (
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border', getTriageColor(triageInfo.triageCategory))}>
            {triageInfo.triageCategory}
          </span>
        )}
        {triageInfo.patientUhid && (
          <span className="text-muted-foreground font-mono text-[10px]">{triageInfo.patientUhid}</span>
        )}
      </div>
      {(triageInfo.patientName || triageInfo.keySymptom) && (
        <div className="space-y-0.5 mt-1">
          {triageInfo.patientName && (
            <div className="font-medium text-foreground truncate" title={triageInfo.patientName}>
              {triageInfo.patientName}
            </div>
          )}
          {triageInfo.keySymptom && (
            <div className="text-muted-foreground line-clamp-2" title={triageInfo.keySymptom}>
              {triageInfo.keySymptom}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

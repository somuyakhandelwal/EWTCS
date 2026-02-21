'use client'

import { memo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

interface DashboardSettingsProps {
    criticalConfirmationEnabled: boolean
    onToggleCriticalConfirmation: () => void
    animationEnabled: boolean
    onToggleAnimations: () => void
}

export const DashboardSettings = memo(function DashboardSettings({
    criticalConfirmationEnabled,
    onToggleCriticalConfirmation,
    animationEnabled,
    onToggleAnimations,
}: DashboardSettingsProps) {
    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={onToggleCriticalConfirmation}
                className={criticalConfirmationEnabled
                    ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                    : 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }
                title={criticalConfirmationEnabled ? 'Critical updates require confirmation' : 'Critical updates are instant (Caution!)'}
                aria-label={criticalConfirmationEnabled ? 'Disable critical update confirmation' : 'Enable critical update confirmation'}
                aria-pressed={criticalConfirmationEnabled}
            >
                {criticalConfirmationEnabled ? (
                    <><ShieldCheck className="mr-2 h-4 w-4" /> Safety On</>
                ) : (
                    <><ShieldAlert className="mr-2 h-4 w-4" /> Safety Off</>
                )}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={onToggleAnimations}
                className={animationEnabled
                    ? 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                }
                title={animationEnabled ? 'Animations enabled' : 'Animations disabled'}
                aria-label={animationEnabled ? 'Disable animations' : 'Enable animations'}
                aria-pressed={animationEnabled}
            >
                {animationEnabled ? 'Animations On' : 'Animations Off'}
            </Button>
        </div>
    )
})

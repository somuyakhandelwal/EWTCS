'use client'

import { memo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

interface DashboardSettingsProps {
    enabled: boolean
    onToggle: () => void
}

export const DashboardSettings = memo(function DashboardSettings({
    enabled,
    onToggle,
}: DashboardSettingsProps) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className={`${enabled
                    ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                    : 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}
            title={enabled ? 'Critical updates require confirmation' : 'Critical updates are instant (Caution!)'}
        >
            {enabled ? (
                <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Safety On
                </>
            ) : (
                <>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Safety Off
                </>
            )}
        </Button>
    )
})

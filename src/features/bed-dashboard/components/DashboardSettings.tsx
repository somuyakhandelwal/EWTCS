'use client'

import { memo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
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
            className={cn(
                'h-8 px-3 rounded-lg border-border transition-all font-semibold text-xs',
                enabled
                    ? 'bg-status-success/10 border-status-success/30 text-status-success hover:bg-status-success/20'
                    : 'text-muted-foreground bg-secondary/30 border-dashed hover:bg-secondary hover:text-foreground'
            )}
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

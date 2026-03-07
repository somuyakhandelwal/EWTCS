import { FileText, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ExportFormat } from '../types/export.types'

interface ExportFormatCardProps {
    format: ExportFormat
    selected: boolean
    onClick: () => void
    disabled?: boolean
}

export function ExportFormatCard({
    format,
    selected,
    onClick,
    disabled,
}: ExportFormatCardProps) {
    const isPdf = format === 'pdf'
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 transition-all',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                selected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-border bg-card text-muted-foreground hover:border-zinc-500',
                disabled && 'opacity-50 pointer-events-none'
            )}
        >
            {isPdf ? (
                <FileText className="h-8 w-8" />
            ) : (
                <FileSpreadsheet className="h-8 w-8" />
            )}
            <span className="text-sm font-medium">{isPdf ? 'PDF' : 'CSV'}</span>
            <span className="text-xs text-muted-foreground">
                {isPdf ? 'With charts & tables' : 'Raw data for Excel'}
            </span>
        </button>
    )
}

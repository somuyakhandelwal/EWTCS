import React from 'react'
import {
    Bed,
    Droplets,
    Activity,
    Clock,
    Flame,
    CheckCircle2,
    Stethoscope,
    Heart,
    AlertTriangle,
    HelpCircle
} from 'lucide-react'
import type { StageColor } from '@/shared/utils/stage-colors'

interface StageIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'color'> {
    color?: string | null
    className?: string
}

const ICON_MAP: Record<StageColor, React.FC<React.SVGProps<SVGSVGElement>>> = {
    gray: Bed,
    blue: Droplets,
    cyan: Activity,
    yellow: Clock,
    orange: Flame,
    green: CheckCircle2,
    purple: Stethoscope,
    pink: Heart,
    red: AlertTriangle,
}

export function StageIcon({ color, className = "h-4 w-4", ...props }: StageIconProps) {
    const IconComponent = color
        ? (ICON_MAP[color.toLowerCase() as StageColor] || HelpCircle)
        : Bed

    return <IconComponent className={className} aria-hidden="true" {...props} />
}

import type { StageColor } from '@/shared/utils/stage-colors'
import {
    Bed,
    Activity,
    Droplets,
    AlertCircle,
    Clock,
    CheckCircle2,
    UserCheck,
    Heart,
    AlertTriangle,
    HelpCircle,
} from 'lucide-react'

interface StageIconProps {
    colorCode: string | null | undefined
    className?: string
}

export function StageIcon({ colorCode, className }: StageIconProps) {
    const code = (colorCode || 'gray').toLowerCase()

    switch (code) {
        case 'gray':
            return <Bed className={className} aria-hidden="true" />
        case 'blue':
            return <Activity className={className} aria-hidden="true" />
        case 'cyan':
            return <Droplets className={className} aria-hidden="true" />
        case 'yellow':
            return <AlertCircle className={className} aria-hidden="true" />
        case 'orange':
            return <Clock className={className} aria-hidden="true" />
        case 'green':
            return <CheckCircle2 className={className} aria-hidden="true" />
        case 'purple':
            return <UserCheck className={className} aria-hidden="true" />
        case 'pink':
            return <Heart className={className} aria-hidden="true" />
        case 'red':
            return <AlertTriangle className={className} aria-hidden="true" />
        default:
            return <HelpCircle className={className} aria-hidden="true" />
    }
}

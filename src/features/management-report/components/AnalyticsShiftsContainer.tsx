import { getShifts } from '@/features/shift-management/lib/shift-queries'
import { PatientCountView } from '@/features/management-report/components/PatientCountView'
import { DelayedPatientPercentageView } from '@/features/management-report/components/DelayedPatientPercentageView'
import { BedPerformanceView } from '@/features/management-report/components/BedPerformanceView'
import { ShiftReportView } from '@/features/shift-management/components/ShiftReportView'

interface Props {
    role: string
    isAuditMode: boolean
}

export async function AnalyticsShiftsContainer({ role, isAuditMode }: Props) {
    const shifts = await getShifts().catch(() => [])

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="print-section print-no-break">
                <PatientCountView shifts={shifts} readOnly={isAuditMode} />
            </div>
            <div className="print-section print-no-break">
                <DelayedPatientPercentageView shifts={shifts} readOnly={isAuditMode} role={role} />
            </div>
            <div className="print-section print-no-break">
                <BedPerformanceView shifts={shifts} readOnly={isAuditMode} />
            </div>
            {shifts.length > 0 && (
                <div data-export-id="export-shift-report" className="print-section print-no-break">
                    <ShiftReportView shifts={shifts} readOnly={isAuditMode} />
                </div>
            )}
        </div>
    )
}

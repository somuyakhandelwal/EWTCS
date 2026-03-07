'use client'
// Reports section content panels — one per tab
// US-10.1–10.7: KPIs, trend, stages, beds, heatmap sections

import { ReportKPICards } from './ReportKPICards'
import { TrendChart } from './TrendChart'
import { StageDelayChart } from './StageDelayChart'
import { BedPerformanceTable } from './BedPerformanceTable'
import { ActivityHeatmap } from './ActivityHeatmap'
import type { ReportData } from '../types/report'

interface Props {
    data: ReportData
    activeTab: string
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">{title}</h2>
            {children}
        </div>
    )
}

export function ReportsSectionContent({ data, activeTab }: Props) {
    return (
        <>
            <div className={`print-section ${activeTab === 'overview' ? '' : 'hidden'}`}>
                <ReportKPICards metrics={data.metrics} />
            </div>

            <div className={`print-section ${activeTab === 'trend' ? '' : 'hidden'}`}>
                <SectionCard title="Daily Trends — Patients · Avg TAT · Delays">
                    <TrendChart trend={data.trend} />
                </SectionCard>
            </div>

            <div className={`print-section ${activeTab === 'stages' ? '' : 'hidden'}`}>
                <SectionCard title="Stage-Wise Average Duration (US-10.5)">
                    <p className="text-xs text-zinc-500">
                        Red bar = bottleneck stage. Sorted by average duration descending.
                    </p>
                    <StageDelayChart stageDelays={data.stageDelays} />
                </SectionCard>
            </div>

            <div className={`print-section ${activeTab === 'beds' ? '' : 'hidden'}`}>
                <SectionCard title="Bed Performance (US-10.4)">
                    <p className="text-xs text-zinc-500">
                        Beds above the 75th percentile for delay rate are flagged as outliers.
                    </p>
                    <BedPerformanceTable beds={data.bedPerformance} />
                </SectionCard>
            </div>

            <div className={`print-section ${activeTab === 'heatmap' ? '' : 'hidden'}`}>
                <SectionCard title="Activity Heatmap — Transitions by Hour &amp; Day (US-10.6)">
                    <ActivityHeatmap heatmap={data.heatmap} />
                </SectionCard>
            </div>
        </>
    )
}

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Bed, Clock, BarChart2, ShieldAlert, HeartPulse, Archive, Upload, TrendingUp } from 'lucide-react'

const QUICK_ACTIONS = [
    { href: '/admin/beds', label: 'Manage Beds', desc: 'Add, edit, and manage hospital beds', icon: Bed, color: 'blue' },
    { href: '/admin/shifts', label: 'Shift Schedules', desc: 'Configure ward shifts for per-shift analytics', icon: Clock, color: 'indigo' },
    { href: '/admin/reports', label: 'Management Reports', desc: 'KPIs, trends, bed performance and heatmaps', icon: BarChart2, color: 'violet' },
    { href: '/admin/audit', label: 'Audit Logs', desc: 'Filterable, paginated compliance trail of all user actions', icon: ShieldAlert, color: 'amber' },
    { href: '/admin/health', label: 'System Health', desc: 'DB pool, active connections, migration state', icon: HeartPulse, color: 'emerald' },
    { href: '/admin/data-retention', label: 'Data Retention', desc: 'Archive old logs, configure retention policies', icon: Archive, color: 'orange' },
    { href: '/admin/import', label: 'Import Data', desc: 'Import historical records from CSV (US-11.5)', icon: Upload, color: 'blue' },
    { href: '/admin/usage', label: 'Usage Metrics', desc: 'System adoption and activity trends (US-18.7)', icon: TrendingUp, color: 'green' },
]

const colorMap: Record<string, { bg: string; border: string; hover: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-900/20', border: 'border-blue-900/50', hover: 'group-hover:bg-blue-900/30', icon: 'text-blue-500', text: 'group-hover:text-blue-400' },
    indigo: { bg: 'bg-indigo-900/20', border: 'border-indigo-900/50', hover: 'group-hover:bg-indigo-900/30', icon: 'text-indigo-400', text: 'group-hover:text-indigo-400' },
    violet: { bg: 'bg-violet-900/20', border: 'border-violet-900/50', hover: 'group-hover:bg-violet-900/30', icon: 'text-violet-400', text: 'group-hover:text-violet-400' },
    amber: { bg: 'bg-amber-900/20', border: 'border-amber-900/50', hover: 'group-hover:bg-amber-900/30', icon: 'text-amber-400', text: 'group-hover:text-amber-400' },
    emerald: { bg: 'bg-emerald-900/20', border: 'border-emerald-900/50', hover: 'group-hover:bg-emerald-900/30', icon: 'text-emerald-400', text: 'group-hover:text-emerald-400' },
    orange: { bg: 'bg-orange-900/20', border: 'border-orange-900/50', hover: 'group-hover:bg-orange-900/30', icon: 'text-orange-400', text: 'group-hover:text-orange-400' },
    green: { bg: 'bg-green-900/20', border: 'border-green-900/50', hover: 'group-hover:bg-green-900/30', icon: 'text-green-400', text: 'group-hover:text-green-400' },
}

export function AdminQuickActions() {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
                <p className="text-sm text-zinc-400 mt-1">Manage system resources</p>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    {QUICK_ACTIONS.map(({ href, label, desc, icon: Icon, color }) => {
                        const c = colorMap[color] ?? colorMap.blue
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="p-4 rounded-lg bg-black/30 border border-zinc-800 hover:border-zinc-700 hover:bg-black/50 transition-all group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 ${c.bg} border ${c.border} rounded-lg ${c.hover} transition-colors`}>
                                        <Icon className={`h-5 w-5 ${c.icon}`} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold text-white ${c.text} transition-colors`}>{label}</h3>
                                        <p className="text-sm text-zinc-500 mt-1">{desc}</p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

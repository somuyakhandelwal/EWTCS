import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { MonthlyUsageSummary } from '@/features/adoption/types'

interface MonthlyUsageTableProps {
    data: MonthlyUsageSummary[]
}

function formatMonth(ym: string): string {
    const [y, m] = ym.split('-')
    const date = new Date(parseInt(y), parseInt(m) - 1, 1)
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function MonthlyUsageTable({ data }: MonthlyUsageTableProps) {
    if (data.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg text-foreground">Monthly Usage Report</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground py-4">
                    No monthly data available yet.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card border-border overflow-hidden">
            <CardHeader>
                <CardTitle className="text-lg text-foreground">Monthly Usage Report</CardTitle>
                <p className="text-sm text-muted-foreground">Last 6 months — logins, updates, and reports at a glance</p>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Logins</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unique Users</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Bed Updates</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reports</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr
                                    key={row.month}
                                    className={`border-b border-border ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                                >
                                    <td className="px-4 py-3 font-medium text-foreground">{formatMonth(row.month)}</td>
                                    <td className="px-4 py-3 text-right text-foreground">{row.totalLogins.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-foreground">{row.uniqueUsers.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-foreground">{row.bedUpdates.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-foreground">{row.reportsGenerated.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

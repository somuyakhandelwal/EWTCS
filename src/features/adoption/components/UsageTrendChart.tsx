'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import type { LoginTrendPoint } from '@/features/adoption/types'

interface UsageTrendChartProps {
    data: LoginTrendPoint[]
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function UsageTrendChart({ data }: UsageTrendChartProps) {
    const chartData = data.map((p) => ({ ...p, label: formatDate(p.date) }))

    if (chartData.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg text-foreground">30-Day Login Trend</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                    No login data available for the last 30 days.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-lg text-foreground">30-Day Login Trend</CardTitle>
                <p className="text-sm text-muted-foreground">Daily login count over the last 30 days</p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--foreground))',
                                fontSize: 12,
                            }}
                            formatter={(value: number) => [value, 'Logins']}
                            labelFormatter={(label: string) => `Date: ${label}`}
                        />
                        <Line
                            type="monotone"
                            dataKey="logins"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

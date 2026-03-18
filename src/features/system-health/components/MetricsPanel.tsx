'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Activity, Cpu, HardDrive, Users, Zap } from "lucide-react"

interface SystemMetrics {
  cpu: number; memory: number; disk: number;
  requestsPerMin: number; activeUsers: number;
}

export function MetricsPanel() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data.system) setMetrics(data.system);
        }
      } finally {
        setLoading(false)
      }
    };
    fetchMetrics();
    const t = setInterval(fetchMetrics, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Live Infrastructure Metrics</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">CPU, memory, disk usage and request rates (SLA monitoring)</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard icon={<Cpu />} label="CPU Usage" value={loading ? '...' : `${metrics?.cpu ?? 0}%`} alert={(metrics?.cpu ?? 0) > 80} />
          <MetricCard icon={<Zap />} label="Memory Use" value={loading ? '...' : `${metrics?.memory ?? 0}%`} alert={(metrics?.memory ?? 0) > 80} />
          <MetricCard icon={<HardDrive />} label="Disk Usage" value={loading ? '...' : `${metrics?.disk ?? 0}%`} alert={(metrics?.disk ?? 0) > 90} />
          <MetricCard icon={<Activity />} label="Req Rate" value={loading ? '...' : `${metrics?.requestsPerMin ?? 0}/m`} />
          <MetricCard icon={<Users />} label="Active Users" value={loading ? '...' : metrics?.activeUsers ?? 0} />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon, label, value, alert }: { icon: React.ReactNode, label: string, value: string | number, alert?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-colors ${alert ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-muted/30 border-transparent text-muted-foreground'}`}>
      <div className={`p-3 rounded-full mb-3 ${alert ? 'bg-destructive/20' : 'bg-background shadow-sm text-primary'}`}>
        {icon}
      </div>
      <p className="font-semibold text-2xl text-foreground">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Bed, BarChart3, Clock, Layers, History, Building2 } from "lucide-react"
import Link from "next/link"
import { ImportDialog } from "@/features/import/components/ImportDialog"

export function AdminQuickActions() {
    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-xl text-foreground">Quick Actions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage system resources
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <Link
                        href="/admin/beds"
                        className="p-4 rounded-lg bg-background border border-border hover:border-border hover:bg-background transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-900/20 border border-blue-900/50 rounded-lg group-hover:bg-blue-900/30 transition-colors">
                                <Bed className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                                    Manage Beds
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Add, edit, and manage hospital beds
                                </p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/analytics"
                        className="p-4 rounded-lg bg-background border border-border hover:border-border hover:bg-background transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-900/20 border border-emerald-900/50 rounded-lg group-hover:bg-emerald-900/30 transition-colors">
                                <BarChart3 className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                                    Ward Analytics
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Stage flow and turnaround time analytics
                                </p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/stages"
                        className="p-4 rounded-lg bg-background border border-border hover:border-border hover:bg-background transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-900/20 border border-purple-900/50 rounded-lg group-hover:bg-purple-900/30 transition-colors">
                                <Layers className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground group-hover:text-purple-400 transition-colors">
                                    Manage Stages
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Configure patient workflow stages
                                </p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/shifts"
                        className="p-4 rounded-lg bg-background border border-border hover:border-border hover:bg-background transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-900/20 border border-emerald-900/50 rounded-lg group-hover:bg-emerald-900/30 transition-colors">
                                <Clock className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                                    Shift Schedules
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Configure Morning, Evening &amp; Night shifts
                                </p>
                            </div>
                        </div>
                    </Link>
                    <div className="p-4 rounded-lg bg-background border border-border hover:border-border hover:bg-background transition-all group flex items-start gap-3">
                        <div className="p-2 bg-amber-900/20 border border-amber-900/50 rounded-lg group-hover:bg-amber-900/30 transition-colors">
                            <History className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-amber-400 transition-colors">
                                Import History
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">
                                Upload CSV to backfill historical patient data
                            </p>
                            <ImportDialog />
                        </div>
                    </div>
                    <Link
                        href="/admin/wards"
                        className="p-4 rounded-lg bg-background border border-border hover:border-border hover:bg-background transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-900/20 border border-indigo-900/50 rounded-lg group-hover:bg-indigo-900/30 transition-colors">
                                <Building2 className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground group-hover:text-indigo-400 transition-colors">
                                    Manage Wards
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Add and configure hospital wards
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}

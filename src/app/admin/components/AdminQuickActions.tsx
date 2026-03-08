import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Bed, BarChart3, Clock, Layers, History, Building2, ListChecks, TrendingUp } from "lucide-react"
import Link from "next/link"
import { ImportDialog } from "@/features/import/components/ImportDialog"

// Each action card shares these base classes — visible hover lift via bg + border change
const cardBase =
    "flex items-start gap-4 p-5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 hover:border-foreground/20 hover:shadow-sm transition-all duration-150 group h-full"

export function AdminQuickActions() {
    return (
        <Card className="bg-card border-border" data-help-id="admin-quick-actions">
            <CardHeader>
                <CardTitle className="text-xl text-foreground">Quick Actions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage system resources
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2">

                    {/* Manage Beds */}
                    <Link href="/admin/beds" className={cardBase}>
                        <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg shrink-0 group-hover:bg-blue-500/20 transition-colors">
                            <Bed className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors text-sm">
                                Manage Beds
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Add, edit, and manage hospital beds
                            </p>
                        </div>
                    </Link>

                    {/* Ward Analytics */}
                    <Link href="/analytics" className={cardBase}>
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                            <BarChart3 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors text-sm">
                                Ward Analytics
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Stage flow and turnaround time analytics
                            </p>
                        </div>
                    </Link>

                    {/* Manage Stages */}
                    <Link href="/admin/stages" className={cardBase}>
                        <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg shrink-0 group-hover:bg-purple-500/20 transition-colors">
                            <Layers className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-purple-400 transition-colors text-sm">
                                Manage Stages
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Configure patient workflow stages
                            </p>
                        </div>
                    </Link>

                    {/* Shift Schedules */}
                    <Link href="/admin/shifts" className={cardBase}>
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                            <Clock className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors text-sm">
                                Shift Schedules
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Configure Morning, Evening &amp; Night shifts
                            </p>
                        </div>
                    </Link>

                    {/* Import History — non-link card, consistent with others */}
                    <div className={cardBase}>
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg shrink-0">
                            <History className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground text-sm">
                                Import History
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed mb-3">
                                Upload CSV to backfill historical patient data
                            </p>
                            <ImportDialog />
                        </div>
                    </div>

                    {/* Manage Wards */}
                    <Link href="/admin/wards" className={cardBase}>
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                            <Building2 className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-indigo-400 transition-colors text-sm">
                                Manage Wards
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Add and configure hospital wards
                            </p>
                        </div>
                    </Link>

                    {/* Delay Reasons */}
                    <Link href="/admin/delay-reasons" className={cardBase}>
                        <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg shrink-0 group-hover:bg-orange-500/20 transition-colors">
                            <ListChecks className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-orange-400 transition-colors text-sm">
                                Delay Reasons
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Configure disposition hold dropdown options
                            </p>
                        </div>
                    </Link>

                    {/* System Adoption */}
                    <Link href="/admin/adoption" className={cardBase}>
                        <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg shrink-0 group-hover:bg-teal-500/20 transition-colors">
                            <TrendingUp className="h-5 w-5 text-teal-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-teal-400 transition-colors text-sm">
                                System Adoption
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Monitor staff usage and engagement
                            </p>
                        </div>
                    </Link>

                </div>
            </CardContent>
        </Card>
    )
}
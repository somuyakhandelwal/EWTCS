import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Bed, BarChart3, Clock, Layers } from "lucide-react"
import Link from "next/link"

export function AdminQuickActions() {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
                <p className="text-sm text-zinc-400 mt-1">
                    Manage system resources
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <Link
                        href="/admin/beds"
                        className="p-4 rounded-lg bg-black/30 border border-zinc-800 hover:border-zinc-700 hover:bg-black/50 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-900/20 border border-blue-900/50 rounded-lg group-hover:bg-blue-900/30 transition-colors">
                                <Bed className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                    Manage Beds
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Add, edit, and manage hospital beds
                                </p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/analytics"
                        className="p-4 rounded-lg bg-black/30 border border-zinc-800 hover:border-zinc-700 hover:bg-black/50 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-900/20 border border-emerald-900/50 rounded-lg group-hover:bg-emerald-900/30 transition-colors">
                                <BarChart3 className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                    Ward Analytics
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Stage flow and turnaround time analytics
                                </p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/stages"
                        className="p-4 rounded-lg bg-black/30 border border-zinc-800 hover:border-zinc-700 hover:bg-black/50 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-900/20 border border-purple-900/50 rounded-lg group-hover:bg-purple-900/30 transition-colors">
                                <Layers className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                                    Manage Stages
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Configure patient workflow stages
                                </p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        href="/admin/shifts"
                        className="p-4 rounded-lg bg-black/30 border border-zinc-800 hover:border-zinc-700 hover:bg-black/50 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-900/20 border border-emerald-900/50 rounded-lg group-hover:bg-emerald-900/30 transition-colors">
                                <Clock className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                    Shift Schedules
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Configure Morning, Evening &amp; Night shifts
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}

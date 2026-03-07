'use client'
// Retention Policies Card — displays and edits data retention policy settings
// US-14.1: Configure retention rules per entity type

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Settings, Loader2 } from 'lucide-react'
import type { RetentionPolicy } from '../lib/retention-queries'

interface Props {
    policies: RetentionPolicy[]
    editMonths: Record<string, string>
    setEditMonths: React.Dispatch<React.SetStateAction<Record<string, string>>>
    savePolicyEdit: (entityType: string) => void
    isPending: boolean
}

export function RetentionPoliciesCard({ policies, editMonths, setEditMonths, savePolicyEdit, isPending }: Props) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-zinc-400" />
                    Retention Policies
                </CardTitle>
                <p className="text-sm text-zinc-400 mt-1">
                    Configure how long active data is kept before archival.
                </p>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {policies.map(pol => {
                        const isEditing = pol.entity_type in editMonths
                        return (
                            <div key={pol.id} className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-zinc-800">
                                <div>
                                    <p className="text-sm font-medium text-white capitalize">{pol.entity_type.replace(/_/g, ' ')}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Retain <strong className="text-zinc-300">{pol.retain_months} months</strong> in active table
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={120}
                                                value={editMonths[pol.entity_type]}
                                                onChange={e => setEditMonths(m => ({ ...m, [pol.entity_type]: e.target.value }))}
                                                className="w-20 h-8 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm"
                                            />
                                            <span className="text-xs text-zinc-400">months</span>
                                            <Button
                                                size="sm"
                                                onClick={() => savePolicyEdit(pol.entity_type)}
                                                disabled={isPending}
                                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                            >
                                                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditMonths(m => { const n = { ...m }; delete n[pol.entity_type]; return n })}
                                                className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditMonths(m => ({ ...m, [pol.entity_type]: String(pol.retain_months) }))}
                                            className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                                        >
                                            Edit
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

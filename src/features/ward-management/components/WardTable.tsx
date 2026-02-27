'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import type { Ward } from '../types/ward.types'

interface WardTableProps {
    wards: Ward[]
}

export function WardTable({ wards }: WardTableProps) {
    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-xl">System Wards</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">Ward Name</th>
                                <th className="px-4 py-3 font-medium">Code</th>
                                <th className="px-4 py-3 font-medium">Description</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {wards.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        No wards found in the system.
                                    </td>
                                </tr>
                            ) : (
                                wards.map((ward) => (
                                    <tr key={ward.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {ward.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ward.code}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ward.description || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={ward.is_active ? 'default' : 'secondary'}>
                                                {ward.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

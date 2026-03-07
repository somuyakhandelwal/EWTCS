import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import type { UserFeedback } from '@/features/adoption/types'

interface FeedbackListProps {
    items: UserFeedback[]
    stats: { total: number; avgRating: number | null; byCategory: Record<string, number> }
}

const CATEGORY_LABELS: Record<string, string> = {
    general: 'General',
    bug: 'Bug',
    feature: 'Feature Request',
    training: 'Training',
    usability: 'Usability',
}

const CATEGORY_COLOURS: Record<string, string> = {
    general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    bug: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    feature: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    training: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    usability: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

function Stars({ rating }: { rating: number | null }) {
    if (rating == null) return <span className="text-muted-foreground text-xs">No rating</span>
    return (
        <span className="text-sm" title={`${rating}/5`}>
            {'⭐'.repeat(rating)}{'☆'.repeat(5 - rating)}
        </span>
    )
}

export function FeedbackList({ items, stats }: FeedbackListProps) {
    return (
        <div className="space-y-4">
            {/* Stats summary */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg text-foreground">User Feedback Summary</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 mb-3">
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">Total submissions</p>
                        </div>
                        {stats.avgRating != null && (
                            <div>
                                <p className="text-2xl font-bold text-foreground">{stats.avgRating.toFixed(1)} / 5</p>
                                <p className="text-xs text-muted-foreground">Average rating</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(stats.byCategory).map(([cat, count]) => (
                            <span
                                key={cat}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLOURS[cat] ?? 'bg-muted text-muted-foreground'}`}
                            >
                                {CATEGORY_LABELS[cat] ?? cat}
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-auto ml-1">{count}</Badge>
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Individual feedback items */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-base text-foreground">Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={item.id} className="p-3 rounded-lg border border-border bg-background space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLOURS[item.category] ?? 'bg-muted text-muted-foreground'}`}
                                            >
                                                {CATEGORY_LABELS[item.category] ?? item.category}
                                            </span>
                                            <Stars rating={item.rating} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-foreground">{item.username ?? 'Unknown'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    {item.message && (
                                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.message}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { submitFeedback } from '@/features/adoption/actions/feedback-actions'
import type { FeedbackCategory } from '@/features/adoption/types'

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'training', label: 'Training / Help' },
    { value: 'usability', label: 'Usability' },
]

const RATING_LABELS: Record<number, string> = {
    1: '😞 Very Poor',
    2: '😕 Poor',
    3: '😐 Average',
    4: '🙂 Good',
    5: '😊 Excellent',
}

interface FeedbackFormProps {
    /** Called after a successful submission so the caller can close a modal etc. */
    onSuccess?: () => void
}

/**
 * In-app feedback form (US-18.7 AC-5).
 * Available to all authenticated roles from any page.
 */
export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
    const [category, setCategory] = useState<FeedbackCategory>('general')
    const [rating, setRating] = useState<number | null>(null)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [isPending, startTransition] = useTransition()

    function reset() {
        setCategory('general')
        setRating(null)
        setMessage('')
        setError('')
        setSubmitted(false)
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (!rating && !message.trim()) {
            setError('Please provide a star rating or a message.')
            return
        }

        startTransition(async () => {
            const result = await submitFeedback({
                category,
                rating: rating ?? null,
                message: message.trim() || null,
            })

            if (!result.success) {
                setError(result.error ?? 'Failed to submit feedback.')
                return
            }

            setSubmitted(true)
            onSuccess?.()
        })
    }

    if (submitted) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
                    <span className="text-4xl">🙏</span>
                    <p className="text-foreground font-medium">Thank you for your feedback!</p>
                    <p className="text-sm text-muted-foreground">Your input helps us improve the system.</p>
                    <Button variant="outline" size="sm" onClick={reset}>Submit another</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-lg text-foreground">Submit Feedback</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Help us improve EWTCS — your feedback is confidential.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setCategory(c.value)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                        category === c.value
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'border-border text-muted-foreground hover:border-primary/60'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Star rating */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Overall Rating <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(rating === star ? null : star)}
                                    className={`text-2xl transition-transform hover:scale-110 ${
                                        rating != null && star <= rating ? 'opacity-100' : 'opacity-30'
                                    }`}
                                    aria-label={RATING_LABELS[star]}
                                    title={RATING_LABELS[star]}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>
                        {rating != null && (
                            <p className="text-xs text-muted-foreground">{RATING_LABELS[rating]}</p>
                        )}
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Message <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <textarea
                            className="w-full min-h-[80px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            placeholder="Describe your experience, report a bug, or suggest an improvement..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? 'Submitting…' : 'Submit Feedback'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

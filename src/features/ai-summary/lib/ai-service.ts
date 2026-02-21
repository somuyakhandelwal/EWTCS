// AI Service — EPIC 9: Daily AI Summary Generator (US-9.1, US-9.3)
// Generates 200-300 word narrative + structured insights with confidence.

import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { logger } from '@/shared/config/logger'
import { buildSummaryPrompt } from './ai-prompts'
import type { DailySummaryInput, AiInsight } from '../types/daily-summary'

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

const aiResponseSchema = z.object({
    narrative: z.string(),
    insights: z.array(z.object({
        text: z.string(),
        category: z.enum(['trend', 'bottleneck', 'success', 'volume', 'metric']).optional(),
        baseConfidence: z.number().min(0).max(100),
    })),
})

type AiResponse = z.infer<typeof aiResponseSchema>

/**
 * Computes confidence per insight based on data quality (transparent, US-9.3).
 * High: >10 patients, many transitions. Medium: 3-10 patients. Low: <3 patients.
 */
function adjustConfidence(
    baseConfidence: number,
    stats: DailySummaryInput
): number {
    const hasVolume = stats.totalPatients >= 10 && stats.totalStageUpdates >= 20
    const hasModerateVolume = stats.totalPatients >= 3 || stats.totalStageUpdates >= 5
    let adjusted = baseConfidence
    if (!hasVolume && !hasModerateVolume) adjusted = Math.min(adjusted, 45)
    else if (!hasVolume) adjusted = Math.min(adjusted, 75)
    return Math.round(Math.max(0, Math.min(100, adjusted)))
}

function parseJsonFromResponse(text: string): unknown {
    const trimmed = text.trim()
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    try {
        return JSON.parse(jsonMatch[0])
    } catch {
        return null
    }
}

/**
 * Generates narrative (200-300 words) and insights with confidence scores.
 * Returns both for storage; falls back to placeholder on error.
 */
export async function generateAiSummary(
    stats: DailySummaryInput
): Promise<{ narrative: string; insights: AiInsight[] }> {
    if (!API_KEY) {
        logger.warn('[ai-summary] GEMINI_API_KEY missing.')
        return {
            narrative: 'AI Summary not generated: GEMINI_API_KEY is missing.',
            insights: [],
        }
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const prompt = buildSummaryPrompt(stats)

        const result = await model.generateContent(prompt)
        const response = await result.response
        const rawText = response.text().trim()

        const parsed = parseJsonFromResponse(rawText)
        const validated = aiResponseSchema.safeParse(parsed)

        if (!validated.success) {
            logger.warn('[ai-summary] AI returned invalid JSON, using narrative fallback')
            return {
                narrative: rawText.slice(0, 1500) || 'AI summary could not be parsed.',
                insights: [],
            }
        }

        const data: AiResponse = validated.data
        const narrative = data.narrative.slice(0, 2500)
        const insights: AiInsight[] = data.insights.slice(0, 8).map((x, i) => ({
            id: `insight-${i}-${Date.now()}`,
            text: x.text.slice(0, 500),
            confidence: adjustConfidence(x.baseConfidence, stats),
            category: x.category,
            flagged: false,
        }))

        return { narrative, insights }
    } catch (error) {
        logger.error('[ai-summary] Gemini generation failed', error as Error)
        return {
            narrative: 'Failed to generate AI summary due to an internal error.',
            insights: [],
        }
    }
}

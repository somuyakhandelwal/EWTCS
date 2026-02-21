// AI Service — EPIC 9: Daily AI Summary Generator (US-9.1, US-9.3)
// Generates 200-300 word narrative + structured insights with confidence.

import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { logger } from '@/shared/config/logger'
import { buildSummaryPrompt } from './ai-prompts'
import type { DailySummaryInput, AiInsight } from '../types/daily-summary'




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

    // Try 1: parse as-is (most models return clean JSON)
    try {
        return JSON.parse(trimmed)
    } catch { /* fall through */ }

    // Try 2: strip markdown code fences (gemini-2.5-flash wraps in ```json ... ```)
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim())
        } catch { /* fall through */ }
    }

    // Try 3: extract first {...} block (legacy fallback)
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0])
        } catch { /* ignored */ }
    }

    return null
}

/**
 * Generates narrative (200-300 words) and insights with confidence scores.
 * Returns both for storage; falls back to placeholder on error.
 */
export async function generateAiSummary(
    stats: DailySummaryInput
): Promise<{ narrative: string; insights: AiInsight[] }> {
    // Read key fresh on every call — picks up .env.local changes without server restart
    const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

    if (!API_KEY) {
        logger.warn('[ai-summary] GEMINI_API_KEY missing.')
        return {
            narrative: 'AI Summary not generated: GEMINI_API_KEY is missing from environment. Add GEMINI_API_KEY to .env.local and restart the server.',
            insights: [],
        }
    }

    // gemini-2.5-flash confirmed working on free tier — use as primary
    const MODELS_TO_TRY = [
        'gemini-2.5-flash',        // ✅ confirmed working — best quality on free tier
        'gemini-2.0-flash-lite',   // fallback: high free-tier quota
        'gemini-2.0-flash',        // fallback: primary 2.0 model
        'gemini-2.0-flash-exp',    // fallback: experimental alias
    ]

    for (const modelName of MODELS_TO_TRY) {
        try {
            logger.info(`[ai-summary] Trying model: ${modelName}`)
            const genAI = new GoogleGenerativeAI(API_KEY)
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    // Force clean JSON output — prevents Gemini 2.5 from adding markdown fences or thinking tokens
                    responseMimeType: 'application/json',
                },
            })
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

            logger.info(`[ai-summary] Successfully generated with model: ${modelName}`)
            return { narrative, insights }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            // Extract HTTP status if SDK provides it
            const statusCode =
                (error as Record<string, unknown>)?.status ??
                (error as Record<string, unknown>)?.statusCode ??
                'unknown'
            logger.warn(`[ai-summary] Model ${modelName} failed [status=${statusCode}]: ${msg}`)

            // For quota (429) or auth (400/403) errors, stop trying — all models share the same key
            if (statusCode === 429) {
                logger.error('[ai-summary] Gemini quota exceeded (429). Stopping model fallback chain.')
                return {
                    narrative: 'AI summary quota exceeded. The Gemini API free-tier daily limit has been reached. Please: (1) wait until midnight Pacific Time for quota reset, or (2) create a new API key at https://aistudio.google.com/app/apikey from a different Google account.',
                    insights: [],
                }
            }
            if (statusCode === 400 || statusCode === 403) {
                logger.error(`[ai-summary] Gemini auth error (${statusCode}). Stopping model fallback chain.`)
                return {
                    narrative: `AI summary generation failed: invalid or restricted API key (HTTP ${statusCode}). Please verify the GEMINI_API_KEY in your .env.local file.`,
                    insights: [],
                }
            }
            // 404 = model not available for this API key (try next model in list)
            // 5xx / network errors = continue to next model
        }
    }

    // All models failed
    logger.error('[ai-summary] All Gemini models failed. Check API key and quota.')
    return {
        narrative: 'Failed to generate AI summary. Please verify the GEMINI_API_KEY is valid and has quota available.',
        insights: [],
    }
}


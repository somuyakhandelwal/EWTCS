// AI Summary — OpenAI API Client
// EPIC 9 US-9.2: Generate daily summary using GPT-4o-mini
// Returns null gracefully when no API key is configured.

import 'server-only'
import OpenAI from 'openai'
import { config } from '@/shared/config/env'
import { logger } from '@/shared/config/logger'
import type { DailyStats } from '../types/summary'

export interface OpenAIResult {
  text: string | null
  confidenceScore: number | null
  model: string | null
}

const MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `You are a clinical operations analyst summarising daily
Emergency Department performance data for a hospital supervisor.
Write a concise, professional narrative of 200-300 words.
Highlight key performance patterns, flag any significant delays or bottlenecks,
and suggest one or two actionable improvements.
Use plain English suitable for clinical leadership — no markdown, no bullet points.`

/** Build the user prompt from aggregated stats */
function buildUserPrompt(stats: DailyStats): string {
  const tatMin = stats.avgTatMs !== null
    ? `${Math.round(stats.avgTatMs / 60_000)} minutes`
    : 'not available'
  const delayPct = `${(stats.delayRate * 100).toFixed(1)}%`

  return `Please summarise the following ED performance data for ${stats.date}:
- Beds occupied: ${stats.bedsUsed}
- Total patients: ${stats.totalPatients}
- Stage transitions: ${stats.totalTransitions}
- Average time-per-stage (TAT): ${tatMin}
- Delayed transitions: ${stats.delayedTransitions} (${delayPct} of total)
- Highest-delay stage: ${stats.topBottleneckStage ?? 'N/A'}
- Busiest shift: ${stats.busiestShift ?? 'N/A'}`
}

/** Compute a confidence score based on data completeness (0-100). */
function computeConfidence(stats: DailyStats): number {
  if (stats.totalTransitions === 0) return 10  // no data at all
  let score = 95
  if (stats.avgTatMs         === null) score -= 15
  if (stats.topBottleneckStage === null) score -= 10
  if (stats.busiestShift      === null) score -= 10
  if (stats.totalPatients     === 0)   score -= 20
  return Math.max(10, score)
}

/**
 * Call OpenAI to generate a daily ED summary narrative.
 * Gracefully returns { text: null, confidenceScore: null, model: null }
 * when OPENAI_API_KEY is not configured.
 */
export async function generateAISummary(stats: DailyStats): Promise<OpenAIResult> {
  const apiKey = config.ai?.apiKey
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY not configured — skipping AI generation')
    return { text: null, confidenceScore: null, model: null }
  }

  const client = new OpenAI({ apiKey })

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserPrompt(stats) },
      ],
      max_tokens: 600,
      temperature: 0.4,
    })

    const text = response.choices[0]?.message?.content?.trim() ?? null
    const confidenceScore = computeConfidence(stats)

    return { text, confidenceScore, model: MODEL }
  } catch (error) {
    logger.error('OpenAI API call failed', error as Error)
    return { text: null, confidenceScore: null, model: null }
  }
}

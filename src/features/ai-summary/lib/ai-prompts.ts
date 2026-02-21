// AI Prompts — EPIC 9 (US-9.1)
// Prompt templates for 200-300 word summary + structured insights.

import type { DailySummaryInput } from '../types/daily-summary'

/**
 * Builds the system prompt for Gemini to generate narrative + insights.
 */
export function buildSummaryPrompt(stats: DailySummaryInput): string {
    const statsBlock = `
STATISTICS for ${stats.summaryDate}:
- Total Patients Admitted: ${stats.totalPatients}
- Unique Beds Used: ${stats.totalBedsUsed}
- Average Turnaround Time (TAT): ${stats.avgTatMinutes} minutes
- Average Time per Stage: ${stats.avgStageTimeMinutes} minutes
- Total Stage Transitions: ${stats.totalStageUpdates}
- Disposition Delays (Alerts): ${stats.delayCount}
${stats.metadata.mostDelayedStage ? `- Most Congested Stage: ${stats.metadata.mostDelayedStage}` : ''}
`.trim()

    return `You are an expert hospital operations analyst. Analyze the following emergency ward statistics and produce:
1. A professional narrative summary (200-300 words) covering key insights, trends, bottlenecks, and successes.
2. A JSON array of 4-6 distinct insights, each with: text (string), category (trend|bottleneck|success|volume|metric), baseConfidence (0-100).

${statsBlock}

INSTRUCTIONS:
- Narrative: Clear, professional language. Identify if the day was Busy/Moderate/Quiet (12 beds capacity). Highlight delays and efficiencies. Plain text, no markdown.
- Insights: Each insight is one sentence. baseConfidence indicates data strength: 80+ for strong data, 50-79 for moderate, below 50 for sparse data.
- Respond with ONLY valid JSON: {"narrative":"...","insights":[{"text":"...","category":"...","baseConfidence":...},...]}`
}

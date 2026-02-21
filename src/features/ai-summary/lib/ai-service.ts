// AI Service — EPIC 9: Daily AI Summary Generator
// Integrates with Google Gemini to transform raw stats into a human-readable summary.

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/shared/config/logger'
import type { DailySummaryInput } from '../types/daily-summary'

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

/**
 * Generates a professional medical/operational summary of the day's statistics.
 * If the API key is missing, it returns a placeholder message.
 */
export async function generateAiSummaryText(stats: DailySummaryInput): Promise<string> {
    if (!API_KEY) {
        logger.warn('[ai-summary] GEMINI_API_KEY is missing. Skipping AI text generation.')
        return 'AI Summary not generated: GEMINI_API_KEY is missing in environment.'
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `
            You are an expert hospital operations analyst. 
            Analyze the following emergency ward statistics for ${stats.summaryDate} and provide a concise, professional summary (max 3-4 sentences).
            Focus on patient flow, bottlenecks, and efficiency.

            STATISTICS:
            - Total Patients Admitted: ${stats.totalPatients}
            - Unique Beds Used: ${stats.totalBedsUsed}
            - Average Turnaround Time (TAT): ${stats.avgTatMinutes} minutes
            - Average Time per Stage: ${stats.avgStageTimeMinutes} minutes
            - total Stage Transitions: ${stats.totalStageUpdates}
            - Disposition Delays (Alerts): ${stats.delayCount}
            ${stats.metadata.mostDelayedStage ? `- Most Congested Stage: ${stats.metadata.mostDelayedStage}` : ''}

            INSTRUCTIONS:
            - Be professional and clinical.
            - Identify if the day was "Busy", "Moderate", or "Quiet" based on volume (12 beds total capacity).
            - Highlight any significant delays if present.
            - Do not use markdown headers or bolding in the output; provide plain text.
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text().trim()

        return text
    } catch (error) {
        logger.error('[ai-summary] Gemini generation failed', error as Error)
        return 'Failed to generate AI summary due to an internal error.'
    }
}

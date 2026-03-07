# AI Summary Generator Guide

The Daily AI Summary Generator automatically aggregates emergency ward bed data at the end of each day and uses Google Gemini to generate a human-readable operational summary.

## 🛠️ How it Works

1.  **Data Aggregation**: At 18:30 UTC (00:00 IST), a cron job runs `scripts/daily-summary-cron.mjs`. It computes:
    *   Total patients admitted.
    *   Average Turnaround Time (TAT).
    *   Average time per stage.
    *   Disposition delay counts.
    *   Most congested workflow stage.
2.  **AI Generation**: The aggregated stats are sent to Google Gemini (using the `gemini-1.5-flash` model). The app generates a 200-300 word narrative plus structured insights with confidence scores (US-9.1, US-9.3).
3.  **Storage**: The resulting stats and generated text are stored in the `daily_summaries` table with status `draft` until approved.
4.  **Review Workflow** (US-9.2): Supervisors receive an in-app notification when drafts exist. They can edit, approve, or reject summaries. Summaries are only published after approval.
5.  **Dashboard**: Administrators and Supervisors can view, generate, and review summaries in the Admin and Supervisor dashboards.

## ⚙️ Configuration

To enable the AI text generation, you must provide a Google Gemini API key in your `.env.local` file:

```bash
# Get a key from https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here
```

If the key is missing, the system will still aggregate data but save a placeholder message for the AI summary.

## 🧪 Testing

You can run automated tests for the AI summary feature using:

```bash
npm test src/features/ai-summary
```

To manually test the flow:
1.  Go to the **Admin Dashboard**.
2.  Find the **Daily AI Summaries** section.
3.  Click **Generate Summary** for a specific date.
4.  The new summary should appear in the history list below.

# Stage Analytics Feature

**Epic:** EPIC 3 - Time Tracking & Stage Logging  
**Purpose:** Enable data analysts to analyze time spent in each stage and patient flow through the emergency ward

## Overview

The Stage Analytics feature provides comprehensive tools for analyzing stage transitions and time spent in each patient workflow stage. This is critical for:

- **Performance Analysis**: Understanding how long patients spend in each stage
- **Bottleneck Identification**: Finding stages where patients are delayed
- **Workflow Optimization**: Making data-driven decisions to improve patient flow
- **Compliance & Reporting**: Documenting patient journey and processing times

## Components

### 1. Database Layer (`lib/stage-analytics.ts`)

Query functions for accessing stage transition data:

- **`getStageTransitions()`** - Fetch all stage transitions with filters for date range, bed, or stage
- **`getStageDurationStats()`** - Get statistical analysis (avg, min, max, percentiles) for each stage
- **`getBedStageTimeline()`** - Get complete timeline for a specific bed
- **`getBedsSortedByCurrentWaitTime()`** - Identify beds with longest current wait times
- **`getBedAnalyticsSummary()`** - Get high-level statistics about all beds

### 2. Server Actions (`actions/analytics-actions.ts`)

Server-side actions with role-based access control:

```typescript
// Fetch stage transitions
await fetchStageTransitions({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  bedId: 'optional-bed-uuid',
  stageId: 'optional-stage-uuid'
})

// Get duration statistics
await fetchStageDurationStats({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
})

// Get bed timeline
await fetchBedStageTimeline(bedId)

// Get longest waiting beds
await fetchLongestWaitingBeds(10)

// Get summary statistics
await fetchAnalyticsSummary()

// Export to CSV
await exportStageTransitionsAsCSV({
  startDate, endDate, bedId, stageId
})
```

**Access Control:** Requires `supervisor` or `admin` role for most analytics operations.

### 3. React Component (`components/StageAnalyticsView.tsx`)

Full-featured analytics dashboard:

```tsx
import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'

export function AnalyticsPage() {
  return (
    <StageAnalyticsView 
      title="Hospital Analytics Dashboard"
      className="p-4"
    />
  )
}
```

**Features:**
- Summary statistics cards (total beds, transitions, avg time per patient)
- Stage duration analysis with percentiles (p50, p90, p95)
- List of longest waiting beds (clickable to view timeline)
- Bed stage timeline visualization
- CSV export functionality
- Date range filtering

### 4. Utility Functions (`lib/analytics-utils.ts`)

Helper functions for common analytics operations:

```typescript
import { 
  formatDuration,
  formatDurationDetailed,
  calculateStagePercentage,
  isDelayed,
  groupByDate,
  calculateAverageDuration,
  generateTransitionCSV,
  detectAnomalies
} from '@/features/bed-dashboard/lib/analytics-utils'

// Format time for display
formatDuration(3661000) // "1h 1m"
formatDurationDetailed(3661000) // "1 hour 1 minute"

// Analyze stage efficiency
const percentInTriage = calculateStagePercentage(1800000, 10800000) // 16.67%

// Check if delayed
if (isDelayed(durationMs, 3600000)) {
  // Longer than 1 hour
}

// Group transitions by date
const byDate = groupByDate(transitions, 'date')

// Detect unusual patterns
const anomalies = detectAnomalies(stageDurations, 2) // 2 std dev threshold
```

### 5. Database Optimization (`migrations/1700000009000_optimize_stage_analytics.sql`)

Performance optimizations for analytical queries:

**Indexes Added:**
- `idx_bed_stage_logs_transition_time_bed` - For date range queries
- `idx_bed_stage_logs_user_transition` - For user activity tracking
- `idx_bed_stage_logs_bed_time` - For bed-specific timeline queries
- `idx_bed_stage_logs_duration` - For duration-based analytics
- `idx_bed_stage_logs_to_stage` - For stage-specific analysis

**Materialized Views:**
- `stage_duration_statistics` - Pre-calculated stats for each stage
- `bed_timeline_summary` - Summary of bed activity

**Note:** Materialized views should be refreshed periodically:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY stage_duration_statistics;
REFRESH MATERIALIZED VIEW CONCURRENTLY bed_timeline_summary;
```

## Usage Examples

### Example 1: Display Analytics Dashboard

```tsx
import { StageAnalyticsView } from '@/features/bed-dashboard/components/StageAnalyticsView'

export default function DashboardPage() {
  return (
    <main className="p-8">
      <StageAnalyticsView />
    </main>
  )
}
```

### Example 2: Get Stage Statistics for a Report

```typescript
'use server'

import { fetchStageDurationStats } from '@/features/bed-dashboard/actions/analytics-actions'

export async function generateMonthlyReport(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const result = await fetchStageDurationStats({ startDate, endDate })
  
  if (result.success) {
    return result.data?.map(stat => ({
      stage: stat.stageName,
      avgTime: formatDuration(stat.averageDurationMs),
      p95Time: formatDuration(stat.p95DurationMs),
      transitions: stat.totalTransitions
    }))
  }
}
```

### Example 3: Track Specific Bed Journey

```typescript
async function analyzeBedPerformance(bedId: string) {
  const result = await fetchBedStageTimeline(bedId)
  
  if (result.success && result.data) {
    const timeline = result.data
    
    console.log(`Bed ${timeline.bedNumber}:`)
    console.log(`Total time: ${formatDuration(timeline.totalTimeMs)}`)
    console.log(`Transitions: ${timeline.transitions.length}`)
    
    timeline.transitions.forEach((t, i) => {
      console.log(`${i + 1}. ${t.fromStageName} → ${t.toStageName}`)
      console.log(`   Duration: ${formatDuration(t.durationInCurrentStageMs)}`)
    })
  }
}
```

### Example 4: Export Data for External Analysis

```typescript
async function exportWeeklyAnalytics() {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const result = await exportStageTransitionsAsCSV({ startDate, endDate })
  
  if (result.success) {
    // Download CSV file
    const blob = new Blob([result.data || ''], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'stage-transitions.csv'
    link.click()
  }
}
```

## Data Structure

### StageTransitionRecord
```typescript
{
  id: string                                // UUID of transition
  bedNumber: string                         // Bed identifier
  bedId: string                            // Bed UUID
  fromStageName: string | null             // Previous stage
  toStageName: string                      // Current stage
  transitionTime: Date                     // When transition occurred
  durationInPreviousStageMs: number | null // How long in previous stage
  durationInCurrentStageMs: number | null  // How long in current stage (calculated)
  changedByUsername: string                // Who made the change
  notes: string | null                     // Additional context
}
```

### StageDurationStats
```typescript
{
  stageName: string              // Stage name
  stageId: string               // Stage UUID
  totalTransitions: number      // Count of transitions to this stage
  averageDurationMs: number     // Average time spent
  minDurationMs: number | null  // Minimum time recorded
  maxDurationMs: number | null  // Maximum time recorded
  medianDurationMs: number | null
  p90DurationMs: number | null  // 90th percentile
  p95DurationMs: number | null  // 95th percentile
}
```

## Performance Considerations

1. **Index Usage**: All queries use indexed columns for fast retrieval
2. **Materialized Views**: Use pre-calculated statistics for summary aggregations
3. **Date Filtering**: Always filter by date range for large datasets
4. **Pagination**: For production use, consider pagination for large result sets

## Common Queries

### Find bottlenecks (longest average time)
```typescript
const stats = await fetchStageDurationStats()
const bottlenecks = stats.sort((a, b) => 
  (b.averageDurationMs || 0) - (a.averageDurationMs || 0)
).slice(0, 5)
```

### Identify delayed beds
```typescript
const waiting = await fetchLongestWaitingBeds(100)
const delayed = waiting.filter(bed => bed.waitTimeMs > 3600000) // > 1 hour
```

### Get today's throughput
```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)
const transitions = await getStageTransitions(today, new Date())
const bedsProcessed = new Set(transitions.map(t => t.bedId)).size
```

## Future Enhancements

- [ ] Advanced filtering UI (by stage, date range, ward)
- [ ] Chart visualizations (time series, box plots)
- [ ] Custom report builder
- [ ] Email alert system for anomalies
- [ ] Real-time dashboard updates via WebSocket
- [ ] Predictive analytics for stage duration
- [ ] Multi-ward comparison reports

## Troubleshooting

**Issue**: Analytics queries are slow  
**Solution**: Run `REFRESH MATERIALIZED VIEW stage_duration_statistics` to refresh pre-calculated data

**Issue**: Data appears outdated  
**Solution**: Ensure materialized views are being refreshed regularly (set up a cron job)

**Issue**: Permission denied error  
**Solution**: User must have `supervisor` or `admin` role to access analytics

## Related Documentation

- [Database Setup](./DATABASE_SETUP.md)
- [User Story 3.1: Implement Stage Duration Tracking](../../reports/US-3.1-IMPLEMENTATION-REPORT.md)
- [EPIC 3: Time Tracking & Stage Logging](../../EPICS.md#epic-3-time-tracking--stage-logging)

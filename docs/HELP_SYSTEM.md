# In-App Help System

## Overview

EWTCS now includes an in-app help system available on every page through a global floating Help button.

## Implemented Capabilities

- Global Help trigger visible across all routes
- Contextual help content resolved from current route
- Searchable help tips inside the help panel
- Dismiss and reopen behavior with local persistence
- Guided tour support with target highlighting for key pages

## Route Contexts Included

- `/dashboard`
- `/supervisor`
- `/admin`
- `/admin/beds`
- `/admin/stages`
- `/admin/wards`
- `/admin/shifts`
- `/admin/delay-reasons`
- `/analytics`
- `/change-password`
- `/login`
- `/manual`
- fallback default context

## Guided Tour Targets

Tour targets are identified using `data-help-id` attributes in key UI regions.

Current targets:
- `dashboard-header`
- `dashboard-actions`
- `dashboard-grid`
- `supervisor-header`
- `supervisor-overview`
- `admin-header`
- `admin-quick-actions`
- `analytics-header`
- `analytics-stage-analytics`
- `analytics-history`
- `admin-beds-header`
- `admin-beds-table`
- `admin-stages-header`
- `admin-stages-list`
- `admin-wards-header`
- `admin-wards-table`
- `admin-shifts-header`
- `admin-shifts-list`
- `admin-delay-reasons-header`
- `admin-delay-reasons-list`
- `change-password-form`

## Telemetry

Help interactions are sent to `POST /api/help/events` and logged using the shared logger.

Tracked events:
- `open`
- `close`
- `search`
- `start_tour`
- `finish_tour`

## Extending Help Content

Update `src/features/help/lib/help-content.ts` to add:
- route context summaries
- search tips
- guided tour steps/selectors

## Validation Notes

- Uses Zod input validation for telemetry API payloads
- Uses shared UI primitives for consistency
- Keeps help feature isolated under `src/features/help`
- Follows file size constraints by splitting components/hooks/types

## Inline Tooltip Standard

### Tooltip API

Use the shared component from `src/shared/components/ui/tooltip.tsx`.

Props:
- `content: string` — short helper text shown on hover/focus
- `side?: 'top' | 'bottom' | 'left' | 'right'` — placement of tooltip bubble (default: `top`)
- `wrapperClassName?: string` — optional wrapper class for layout-safe block wrapping
- `children: ReactNode` — interactive element to wrap

Example:

```tsx
import { Tooltip } from '@/shared/components/ui/tooltip'
import { Button } from '@/shared/components/ui/button'

<Tooltip content="Return to admin overview" side="bottom">
  <Button variant="outline">← Back to Admin</Button>
</Tooltip>
```

### File Coverage (10 files)

1. `src/app/login/page.tsx`
	- Wrapped element: `Sign In` submit button
	- Tooltip text: `Sign in to your dashboard`

2. `src/features/bed-dashboard/components/BedDashboardClient.tsx`
	- Wrapped element: `Add Virtual Bed` button
	- Tooltip text: `Create temporary virtual bed`

3. `src/app/supervisor/page.tsx`
	- Wrapped element: `Analytics` link button
	- Tooltip text: `Open analytics dashboard`

4. `src/features/bed-dashboard/components/AnalyticsPageContent.tsx`
	- Wrapped elements: `Back` button, `PrintButton`, `ExportReportButton`
	- Tooltip texts: `Return to previous page`, `Print current analytics view`, `Download full PDF report`

5. `src/app/admin/components/AdminQuickActions.tsx`
	- Wrapped elements: quick-action links for Beds, Analytics, Stages, Shifts, Wards, Delay Reasons
	- Tooltip texts: `Manage beds and assignments`, `View ward performance trends`, `Configure workflow stages`, `Set operational shift windows`, `Manage ward definitions`, `Edit disposition reason list`

6. `src/app/admin/beds/page.tsx`
	- Wrapped element: `← Back to Admin` button
	- Tooltip text: `Return to admin overview`

7. `src/app/admin/stages/page.tsx`
	- Wrapped element: `← Back to Admin` button
	- Tooltip text: `Return to admin overview`

8. `src/app/admin/wards/page.tsx`
	- Wrapped elements: both `← Back to Admin` buttons (error and success states)
	- Tooltip text: `Return to admin overview`

9. `src/app/admin/shifts/page.tsx`
	- Wrapped element: `← Back to Admin` button
	- Tooltip text: `Return to admin overview`

10. `src/app/admin/delay-reasons/page.tsx`
	 - Wrapped element: `← Back to Admin` button
	 - Tooltip text: `Return to admin overview`

### Rules (must follow)

1. Keep existing accessibility labels (`aria-label`, `title`) unchanged.
2. Keep tooltip copy concise (prefer under 10 words).
3. Use side placement by layout direction (`left` for right docked controls, `bottom` for top headers).
4. Wrap only interactive controls (buttons/links/inputs), not large non-interactive containers.
5. Use the shared `Tooltip` component only; do not introduce new color/shadow tokens.

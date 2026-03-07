# Help System QA Checklist

Use this checklist to verify the in-app help story against acceptance criteria.

## Scope

- Feature: In-app contextual help
- Related story: Help screens accessible within app
- Epic: Deployment, Training & Documentation

## Acceptance Criteria Verification

### 1) Help icon is visible on all pages

- [ ] Open each major route (`/dashboard`, `/supervisor`, `/admin`, `/analytics`, `/admin/beds`, `/admin/stages`, `/admin/wards`, `/admin/shifts`, `/admin/delay-reasons`, `/login`, `/manual`, `/change-password`)
- [ ] Confirm floating **Help** button is visible
- [ ] Confirm it remains available after navigation changes

### 2) Help content is contextual to current page

- [ ] On each route above, click **Help**
- [ ] Confirm panel title and summary match route context
- [ ] Confirm route-specific tips are shown

### 3) Help includes tooltips and guided tours

- [ ] Confirm Help trigger has hover title/accessible label
- [ ] On routes with configured tours (`/dashboard`, `/supervisor`, `/admin`, `/analytics`, and covered admin subpages), click **Start Tour**
- [ ] Confirm step highlight follows target sections and navigation controls work

### 4) Help is searchable

- [ ] In Help panel, type a keyword from an existing tip
- [ ] Confirm matching tips remain visible
- [ ] Type a non-matching value and confirm "No help items matched" appears

### 5) Help can be dismissed and reopened

- [ ] Open Help panel and close it via dismiss button
- [ ] Reopen with floating Help button
- [ ] Refresh page and confirm open/closed state persists

## Telemetry Checks

- [ ] Open browser dev tools network tab
- [ ] Verify `POST /api/help/events` fires for open/close/search/tour actions
- [ ] Confirm no UI break if telemetry request fails

## Regression Checks

- [ ] Verify existing page actions still work while help panel is open
- [ ] Verify guided tour can be exited at any step
- [ ] Verify no console errors on route change while tour/panel is active

## Notes for Reviewers

- Route help contexts are configured in `src/features/help/lib/help-content.ts`
- Global help shell is mounted in `src/app/layout.tsx`
- Telemetry endpoint is `src/app/api/help/events/route.ts`

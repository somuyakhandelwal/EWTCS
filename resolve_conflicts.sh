#!/bin/bash

# Accept theirs for files that should be completely from upstream
git checkout --theirs docs/archive/SHARED_UTILITIES.md 2>/dev/null || true
git checkout --theirs reports/FEATURE-FIRST-ARCHITECTURE-PLAN.md 2>/dev/null || true

# Accept ours for files we recently updated
git checkout --ours .env.example
git checkout --ours README.md

# Accept theirs for migration files (they should be identical anyway)
git checkout --theirs migrations/008_add_bed_stage_log_immutability.sql
git checkout --theirs migrations/009_create_bed_stage_log_corrections.sql
git checkout --theirs migrations/010_create_stage_transitions.sql

# Accept theirs for validation scripts (newer versions)
git checkout --theirs scripts/validate-db-connection.js
git checkout --theirs scripts/validate-db-schema.js
git checkout --theirs scripts/validate-env-example.js
git checkout --theirs scripts/validate-migrations.js

# Accept theirs for UI components that have newer features
git checkout --theirs src/shared/components/ui/badge.tsx
git checkout --theirs src/shared/components/ui/context-menu.tsx

# Accept theirs for bed-dashboard components with new features
git checkout --theirs src/features/bed-dashboard/components/BedStageButtons.tsx
git checkout --theirs src/features/bed-dashboard/lib/bed-mutations.ts
git checkout --theirs src/features/bed-dashboard/lib/bed-queries.ts

# Accept theirs for auth components
git checkout --theirs src/features/auth/components/LogoutButton.tsx

# Accept theirs for pages with new features
git checkout --theirs src/app/admin/page.tsx
git checkout --theirs src/app/supervisor/page.tsx

echo "Basic conflicts resolved"

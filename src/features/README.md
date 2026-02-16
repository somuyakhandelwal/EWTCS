# Features Directory

This directory contains all feature modules organized by business domain. Each feature is self-contained with its own components, actions, business logic, schemas, and types.

## Structure

Each feature follows this structure:

```
feature-name/
├── components/        # Feature-specific UI components
├── actions/           # Server actions for this feature
├── lib/               # Business logic, queries, mutations
├── schemas/           # Zod validation schemas
├── hooks/             # React hooks specific to this feature
└── types/             # TypeScript types for this feature
```

## Current Features

### `auth/`
**EPIC 5: Authentication & Role-Based Access**
- User authentication and session management
- Login/logout functionality
- JWT session handling
- Permission verification

### `user-management/` *(Not yet in main branch)*
**EPIC 5: User Management (Admin)**
- Admin user CRUD operations
- User table and dialogs
- Audit logging
- Role management

## Future Features

Based on EPICS.md, upcoming features will include:

### `bed-dashboard/`
**EPIC 1: Nurse Desk Bed Dashboard**
- Real-time bed status grid
- Color-coded bed states
- Auto-refresh functionality

### `bed-management/`
**EPIC 2: One-Click Stage Update System**
- Quick stage transitions
- Bed status updates
- Workflow controls

### `time-tracking/`
**EPIC 3: Time Tracking & Stage Logging**
- Timestamp capture
- Duration calculations
- Historical logs

### `visual-alerts/`
**EPIC 4: Color Coding & Visual Alerts**
- Alert components
- Color mapping logic
- Visual indicators

### `configuration/`
**EPIC 6: Bed & Workflow Configuration**
- System configuration UI
- Bed setup
- Workflow customization

### `shift-management/`
**EPIC 8: Shift Management**
- Shift tracking
- Staff assignment
- Analytics

### `ai-summary/`
**EPIC 9: Daily AI Summary Generator**
- AI report generation
- Summary formatting
- Export functionality

### `reports/`
**EPIC 10: Management Report Dashboard**
- Analytics dashboard
- Report generation
- Data visualization

### `audit/`
**EPIC 12: Audit Logs & Compliance**
- Comprehensive audit trails
- Compliance tracking
- Log viewing

### `notifications/`
**EPIC 15: Notifications & Alerts**
- Alert system
- Notification delivery
- User preferences

### `export/`
**EPIC 11: Export & External Sharing**
- Data export
- Report sharing
- Integration endpoints

## Adding a New Feature

1. Create the feature directory structure:
   ```bash
   mkdir -p src/features/[feature-name]/{components,actions,lib,schemas,hooks,types}
   ```

2. Add feature code following the co-location principle

3. Export public API from feature's index files

4. Import using the feature alias:
   ```typescript
   import { Component } from '@/features/[feature-name]/components/...'
   ```

5. Update this README with the new feature

## Guidelines

- ✅ Keep features self-contained
- ✅ Co-locate related code
- ✅ Use clear naming conventions
- ✅ Document complex features
- ✅ Export clean public APIs
- ❌ Don't create circular dependencies between features
- ❌ Don't import from another feature's internals
- ❌ Don't mix shared code into features (use `/shared` instead)

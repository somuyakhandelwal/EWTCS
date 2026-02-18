# Shared Utilities Guide

This document explains the reusable shared utilities available for all features in the EWTCS application.

## Overview

The `src/shared/lib/` directory contains generic, reusable utilities that can be used across any feature (user management, bed management, patient management, etc.). These utilities eliminate code duplication and ensure consistency.

## Available Utilities

### 1. Authentication & Authorization (`@/shared/lib/auth`)

Generic role-based access control utilities.

#### `requireRole(allowedRoles)`

Verify user has specific role(s). Throws error if unauthorized.

```typescript
import { requireRole } from '@/shared/lib/auth'

// Single role
await requireRole('admin')

// Multiple roles
await requireRole(['admin', 'supervisor'])
```

#### Convenience Functions

```typescript
import { requireAdmin, requireSupervisorOrAdmin, getCurrentSession } from '@/shared/lib/auth'

// Admin only
const session = await requireAdmin()

// Supervisor or Admin
const session = await requireSupervisorOrAdmin()

// Optional auth (returns null if not authenticated)
const session = await getCurrentSession()
```

---

### 2. Audit Logging (`@/shared/lib/audit`)

Generic audit trail system for tracking changes to any entity.

#### `logAudit(entry)`

Log any entity action to the audit trail.

```typescript
import { logAudit } from '@/shared/lib/audit'

// Log user creation
await logAudit({
  actionType: 'CREATE',
  entityType: 'user',
  entityId: newUserId,
  performedBy: adminId,
  changes: { username, role }
})

// Log bed status change
await logAudit({
  actionType: 'UPDATE',
  entityType: 'bed',
  entityId: bedId,
  performedBy: nurseId,
  changes: { status: 'occupied' },
  reason: 'Patient admitted'
})

// Log patient discharge
await logAudit({
  actionType: 'DELETE',
  entityType: 'patient',
  entityId: patientId,
  performedBy: doctorId,
  reason: 'Discharged',
  metadata: { dischargeDate: '2024-01-15' }
})
```

#### `getAuditLogs(entityType, entityId?, limit?)`

Retrieve audit logs for a specific entity type.

```typescript
import { getAuditLogs } from '@/shared/lib/audit'

// All user logs (last 100)
const userLogs = await getAuditLogs('user')

// Specific user's logs
const specificUserLogs = await getAuditLogs('user', userId)

// Last 50 bed logs
const bedLogs = await getAuditLogs('bed', undefined, 50)
```

#### `getRecentAuditLogs(limit?)`

Get recent logs across all entity types.

```typescript
import { getRecentAuditLogs } from '@/shared/lib/audit'

// Last 50 actions across all entities
const recentLogs = await getRecentAuditLogs(50)
```

---

### 3. Database Helpers (`@/shared/lib/db-helpers`)

Generic CRUD helpers to reduce boilerplate code.

#### `getAll(table, where?, params?, orderBy?)`

Get all records from a table with optional filtering.

```typescript
import { getAll } from '@/shared/lib/db-helpers'

// All active users
const users = await getAll('users', 'is_active = $1', [true])

// All beds, ordered by room number
const beds = await getAll('beds', undefined, [], 'room_number ASC')
```

#### `getById(table, id, idColumn?)`

Get a single record by ID.

```typescript
import { getById } from '@/shared/lib/db-helpers'

// Get user by ID
const user = await getById('users', userId)

// Get bed by custom ID column
const bed = await getById('beds', bedNumber, 'bed_number')
```

#### `exists(table, where, params)`

Check if a record exists.

```typescript
import { exists } from '@/shared/lib/db-helpers'

// Check if username exists
const usernameExists = await exists('users', 'username = $1', [username])

// Check if bed is occupied
const bedOccupied = await exists('beds', 'id = $1 AND status = $2', [bedId, 'occupied'])
```

#### `softDelete(table, id, idColumn?)`

Soft delete by setting `is_active = false`.

```typescript
import { softDelete } from '@/shared/lib/db-helpers'

// Deactivate user
await softDelete('users', userId)

// Deactivate bed
await softDelete('beds', bedId)
```

#### `reactivate(table, id, idColumn?)`

Reactivate by setting `is_active = true`.

```typescript
import { reactivate } from '@/shared/lib/db-helpers'

// Reactivate user
await reactivate('users', userId)

// Reactivate bed
await reactivate('beds', bedId)
```

#### `updateRecord(table, id, updates, idColumn?)`

Generic update helper.

```typescript
import { updateRecord } from '@/shared/lib/db-helpers'

// Update user details
await updateRecord('users', userId, {
  full_name: 'Jane Doe',
  email: 'jane@example.com'
})

// Update bed status
await updateRecord('beds', bedId, {
  status: 'occupied',
  patient_id: patientId
})
```

#### `count(table, where?, params?)`

Count records with optional filtering.

```typescript
import { count } from '@/shared/lib/db-helpers'

// Count all active users
const activeUserCount = await count('users', 'is_active = $1', [true])

// Count occupied beds
const occupiedBeds = await count('beds', 'status = $1', ['occupied'])
```

---

## Migration: Generic Audit Logs

The `audit_logs` table (created in migration 004) is designed to track changes to any entity:

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,      -- CREATE, UPDATE, DELETE, etc.
    entity_type VARCHAR(50) NOT NULL,      -- 'user', 'bed', 'patient', etc.
    entity_id UUID NOT NULL,               -- ID of the entity
    performed_by_user_id UUID NOT NULL,    -- Who performed the action
    changes JSONB,                         -- What was changed
    reason TEXT,                           -- Optional reason
    metadata JSONB,                        -- Additional context
    created_at TIMESTAMP WITH TIME ZONE
);
```

### Indexes

- `(entity_type, entity_id)` - Fast lookups for specific entity logs
- `entity_type` - Fast filtering by entity type
- `action_type` - Fast filtering by action type
- `created_at DESC` - Fast chronological queries

---

## Usage Examples

### Creating a New Feature (e.g., Bed Management)

#### 1. Authentication

```typescript
// src/features/bed-management/actions/bed-actions.ts
import { requireRole } from '@/shared/lib/auth'

export async function updateBedStatus(bedId: string, status: string) {
  // Only nurses, supervisors, and admins
  const session = await requireRole(['nurse', 'supervisor', 'admin'])
  
  // ... update logic
}
```

#### 2. Audit Logging

```typescript
// Log the bed status change
import { logAudit } from '@/shared/lib/audit'

await logAudit({
  actionType: 'UPDATE',
  entityType: 'bed',
  entityId: bedId,
  performedBy: session.userId,
  changes: { status },
  reason: 'Patient assigned to bed'
})
```

#### 3. Database Operations

```typescript
// src/features/bed-management/lib/queries.ts
import { getAll, getById, exists } from '@/shared/lib/db-helpers'

export async function getAllBeds() {
  return getAll('beds', 'is_active = $1', [true], 'room_number ASC')
}

export async function getBedById(bedId: string) {
  return getById('beds', bedId)
}

export async function isBedOccupied(bedId: string) {
  return exists('beds', 'id = $1 AND status = $2', [bedId, 'occupied'])
}
```

#### 4. Viewing Audit Logs

```typescript
// src/features/bed-management/lib/queries.ts
import { getAuditLogs } from '@/shared/lib/audit'

export async function getBedHistory(bedId: string) {
  return getAuditLogs('bed', bedId, 50)
}
```

---

## Best Practices

### 1. Always Use Shared Utilities

❌ **Don't:**
```typescript
// Don't duplicate role checking logic
export async function requireNurse() {
  const session = await verifyActiveSession()
  if (session.role !== 'nurse') throw new Error('Unauthorized')
  return session
}
```

✅ **Do:**
```typescript
// Use shared utility
import { requireRole } from '@/shared/lib/auth'

export async function nurseOnlyAction() {
  await requireRole('nurse')
  // ... rest of logic
}
```

### 2. Use Generic Audit Logging

❌ **Don't:**
```typescript
// Don't create feature-specific audit tables
await pool.query(
  'INSERT INTO bed_management_logs (action, bed_id, user_id) VALUES ($1, $2, $3)',
  [action, bedId, userId]
)
```

✅ **Do:**
```typescript
// Use generic audit system
import { logAudit } from '@/shared/lib/audit'

await logAudit({
  actionType: action,
  entityType: 'bed',
  entityId: bedId,
  performedBy: userId
})
```

### 3. Leverage DB Helpers

❌ **Don't:**
```typescript
// Don't write repetitive queries
const result = await pool.query('SELECT * FROM beds WHERE id = $1', [bedId])
return result.rows[0]
```

✅ **Do:**
```typescript
// Use helper
import { getById } from '@/shared/lib/db-helpers'

return getById('beds', bedId)
```

### 4. Consistent Entity Types

Use consistent entity type names in audit logs:
- `'user'` - for user management
- `'bed'` - for bed management
- `'patient'` - for patient management
- `'appointment'` - for appointment scheduling

### 5. Meaningful Action Types

Use descriptive action types:
- `'CREATE'` - Entity created
- `'UPDATE'` - Entity updated
- `'DELETE'` - Entity deleted (hard delete)
- `'ACTIVATE'` - Entity activated
- `'DEACTIVATE'` - Entity deactivated
- `'LOGIN'` - User logged in
- `'LOGOUT'` - User logged out
- `'ASSIGN'` - Assignment operation (e.g., patient to bed)
- `'RELEASE'` - Release operation (e.g., bed freed)

---

## Testing Utilities

All shared utilities include error handling and logging. Test error scenarios:

```typescript
// Test unauthorized access
try {
  await requireRole('admin')
} catch (error) {
  // Expected: "Unauthorized: Required role(s): admin"
}

// Test duplicate prevention
const exists = await exists('users', 'username = $1', ['testuser'])
if (exists) {
  throw new Error('Username already exists')
}
```

---

## Summary

The shared utilities provide:

1. **🔐 Auth**: Generic role-based access control
2. **📝 Audit**: Universal audit logging for all entities
3. **🗄️ DB Helpers**: Common CRUD patterns

These utilities ensure:
- ✅ Code consistency across features
- ✅ Reduced duplication
- ✅ Easier maintenance
- ✅ Faster feature development
- ✅ Centralized security and logging

When building new features, **always check shared utilities first** before writing custom code.

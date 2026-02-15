# Shared Directory

This directory contains common code that is reusable across multiple features. Following the **hybrid architecture** principle, code that is used by 2+ features should live here.

## Structure

```
shared/
├── components/        # Reusable UI components
│   └── ui/            # shadcn/ui primitives (Button, Card, Input, etc.)
├── lib/               # Common utilities and functions
│   ├── utils.ts       # General utility functions
│   └── db-client.ts   # Database connection client
├── config/            # Application configuration
│   ├── env.ts         # Environment variable handling
│   ├── logger.ts      # Logging utility
│   ├── secrets.ts     # Secret management
│   └── init.ts        # App initialization
├── hooks/             # Common React hooks
│   ├── use-toast.ts   # Toast notifications
│   └── use-debounce.ts # Debounce utility
├── types/             # Shared TypeScript types
│   ├── common.types.ts
│   └── config.types.ts
└── constants/         # Application constants
    └── roles.ts       # User role constants
```

## When to Use Shared

### ✅ Put code in `/shared` when:
- Used by 2+ features
- Part of the design system (UI components)
- Application-wide configuration
- Common utilities (formatters, validators)
- Shared TypeScript types/interfaces
- Global constants

### ❌ Don't put in `/shared` when:
- Feature-specific logic
- Only used in one feature
- Tightly coupled to business domain
- Feature-specific types

## Import Convention

Always use the `@/shared/*` alias:

```typescript
// UI Components
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'

// Configuration
import { logger } from '@/shared/config/logger'
import { config } from '@/shared/config/env'

// Utilities
import { cn } from '@/shared/lib/utils'

// Types
import type { Config } from '@/shared/types/config.types'
```

## Components

### UI Components (`components/ui/`)
Base components from shadcn/ui:
- `button.tsx` - Button component with variants
- `card.tsx` - Card container components
- `input.tsx` - Form input component
- `label.tsx` - Form label component

These are primitives that features compose into domain-specific components.

## Configuration (`config/`)

### `env.ts`
Centralized environment variable access with validation.

### `logger.ts`
Structured logging utility:
- Color-coded for development
- JSON output for production
- Log levels: info, warn, error

### `secrets.ts`
Secret management and encryption utilities.

### `init.ts`
Application initialization logic:
- System startup checks
- Health check functionality
- Database connection verification

## Utilities (`lib/`)

### `utils.ts`
Common helper functions:
- `cn()` - Class name merging (tailwind-merge + clsx)
- Add more utilities as needed

### `db-client.ts`
Shared database client configuration (if needed by multiple features directly).

## Adding Shared Code

1. **Before adding:** Verify it's truly shared (used by 2+ features)

2. **Choose the right location:**
   - `/components/ui/` - Reusable UI primitives
   - `/lib/` - Utilities and helpers
   - `/config/` - Configuration
   - `/types/` - Shared types
   - `/constants/` - App-wide constants
   - `/hooks/` - Common React hooks

3. **Keep it generic:** Shared code should be domain-agnostic

4. **Document well:** Add JSDoc comments for exported functions

## Migration from Feature to Shared

If feature code is needed by another feature:

1. Move code to appropriate `/shared` subdirectory
2. Make it more generic if needed
3. Update imports in both features
4. Update exports/documentation

## Examples

### Good Shared Code ✅
```typescript
// shared/lib/utils.ts
export function formatDate(date: Date): string {
  return date.toISOString()
}

// shared/components/ui/button.tsx
export function Button({ children, ...props }) {
  return <button {...props}>{children}</button>
}
```

### Bad Shared Code ❌
```typescript
// shared/lib/user-utils.ts
// ❌ This is user-management specific!
export function validateUsername(username: string) { ... }

// Should be in: features/user-management/lib/validators.ts
```

---

**Remember:** Shared code is a privilege, not a dumping ground. Keep it lean, generic, and well-documented.

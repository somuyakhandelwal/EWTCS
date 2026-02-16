# Feature-First Hybrid Architecture Plan
**Project:** EWTCS (Emergency Ward Bed Status & AI Reporting System)  
**Date:** February 15, 2026  
**Type:** Architectural Refactoring

---

## 🎯 Objective

Restructure the entire codebase from a mixed traditional/feature structure to a **Feature-First Hybrid Architecture** for better scalability, maintainability, and team collaboration.

---

## 📊 Current Structure Analysis

### Existing Organization:
```
src/
├── actions/                    # Flat server actions
│   ├── auth.ts
│   └── user-management.ts
├── app/                        # Next.js routes
│   ├── admin/
│   ├── dashboard/
│   ├── login/
│   └── supervisor/
├── components/                 # Mixed organization
│   ├── admin/                  # Role-based grouping
│   └── ui/                     # Shared UI components
├── db/
│   └── index.ts
├── lib/                        # Mixed utilities
│   ├── config/
│   ├── db/
│   ├── session.ts
│   ├── user-management/        # Feature module (good!)
│   └── utils.ts
├── types/
│   └── config.ts
└── middleware.ts
```

### Issues Identified:
1. ❌ **Inconsistent organization** - Some features modular (user-management), others flat
2. ❌ **No clear feature boundaries** - Components split by role, not feature
3. ❌ **Hard to scale** - Adding new features means touching multiple directories
4. ❌ **Team collaboration challenges** - Hard to assign feature ownership
5. ❌ **Code discovery difficulty** - Related code scattered across folders

---

## 🏗️ New Feature-First Hybrid Architecture

### Core Principles:
1. **Feature-First** - Organize by business domain/feature
2. **Hybrid** - Shared code extracted to common layer
3. **Co-location** - Related code lives together
4. **Isolation** - Features are self-contained modules
5. **Scalability** - Easy to add new features without restructuring

### New Structure:
```
src/
├── features/                          # 🆕 Feature modules (business domains)
│   │
│   ├── auth/                          # Authentication & Session Management
│   │   ├── components/
│   │   │   └── login-form.tsx
│   │   ├── actions/
│   │   │   └── auth-actions.ts
│   │   ├── lib/
│   │   │   └── session.ts
│   │   ├── schemas/
│   │   │   └── auth-schema.ts
│   │   ├── hooks/
│   │   │   └── use-session.ts
│   │   └── types/
│   │       └── auth-types.ts
│   │
│   ├── user-management/               # Admin User CRUD (EPIC 5)
│   │   ├── components/
│   │   │   ├── user-management-table.tsx
│   │   │   ├── create-user-dialog.tsx
│   │   │   └── edit-user-dialog.tsx
│   │   ├── actions/
│   │   │   └── user-management-actions.ts
│   │   ├── lib/
│   │   │   ├── mutations.ts
│   │   │   ├── queries.ts
│   │   │   ├── audit.ts
│   │   │   └── auth.ts
│   │   ├── schemas/
│   │   │   └── user-management-schema.ts
│   │   └── types/
│   │       └── user-management-types.ts
│   │
│   ├── bed-dashboard/                 # EPIC 1: Nurse Desk Bed Dashboard
│   │   ├── components/
│   │   ├── actions/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── types/
│   │
│   ├── bed-management/                # EPIC 2: One-Click Stage Updates
│   │   ├── components/
│   │   ├── actions/
│   │   ├── lib/
│   │   └── types/
│   │
│   ├── time-tracking/                 # EPIC 3: Time & Stage Logging
│   │   ├── components/
│   │   ├── actions/
│   │   ├── lib/
│   │   └── types/
│   │
│   ├── visual-alerts/                 # EPIC 4: Color Coding & Alerts
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   │
│   ├── configuration/                 # EPIC 6: Bed & Workflow Config
│   │   ├── components/
│   │   ├── actions/
│   │   ├── lib/
│   │   └── types/
│   │
│   ├── shift-management/              # EPIC 8: Shift Analytics
│   ├── ai-summary/                    # EPIC 9: AI Report Generation
│   ├── reports/                       # EPIC 10: Management Dashboard
│   ├── audit/                         # EPIC 12: Audit Logs
│   ├── notifications/                 # EPIC 15: Alerts System
│   └── export/                        # EPIC 11: Data Export
│
├── shared/                            # 🆕 Shared/Common layer (Hybrid)
│   ├── components/                    # Reusable UI components
│   │   └── ui/                        # shadcn/ui primitives
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── ...
│   │
│   ├── lib/                           # Common utilities
│   │   ├── utils.ts                   # General utilities
│   │   ├── db-client.ts               # Database connection
│   │   └── validators.ts              # Common validation
│   │
│   ├── config/                        # Application configuration
│   │   ├── env.ts                     # Environment variables
│   │   ├── logger.ts                  # Logging utility
│   │   ├── secrets.ts                 # Secret management
│   │   └── init.ts                    # App initialization
│   │
│   ├── hooks/                         # Common React hooks
│   │   ├── use-toast.ts
│   │   └── use-debounce.ts
│   │
│   ├── types/                         # Shared TypeScript types
│   │   ├── common.types.ts
│   │   └── config.types.ts
│   │
│   └── constants/                     # Application constants
│       └── roles.ts
│
├── app/                               # Next.js App Router (routes only!)
│   │
│   ├── (auth)/                        # Auth route group
│   │   └── login/
│   │       └── page.tsx               # Uses features/auth
│   │
│   ├── (dashboard)/                   # Protected routes group
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Nurse dashboard
│   │   ├── admin/
│   │   │   └── page.tsx               # Admin panel
│   │   └── supervisor/
│   │       └── page.tsx               # Supervisor view
│   │
│   ├── api/                           # API routes
│   │   └── health/
│   │       └── route.ts
│   │
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Homepage (redirect)
│   └── globals.css                    # Global styles
│
├── db/                                # Database layer (standalone)
│   └── index.ts                       # Connection pool
│
└── middleware.ts                      # Next.js middleware
```

---

## 📋 Migration Plan

### Phase 1: Create New Structure ✓
1. Create `features/` directory
2. Create `shared/` directory
3. Set up folder templates for each feature

### Phase 2: Migrate Shared Code
1. Move `components/ui/` → `shared/components/ui/`
2. Move `lib/config/` → `shared/config/`
3. Move `lib/utils.ts` → `shared/lib/utils.ts`
4. Move `lib/db/` → `shared/lib/` (rename to db-client.ts)
5. Move `types/config.ts` → `shared/types/config.types.ts`

### Phase 3: Migrate Auth Feature
1. Create `features/auth/` structure
2. Move `actions/auth.ts` → `features/auth/actions/auth-actions.ts`
3. Move `lib/session.ts` → `features/auth/lib/session.ts`
4. Update `app/login/page.tsx` to use new paths

### Phase 4: Migrate User Management Feature
1. Create complete `features/user-management/` structure
2. Move `actions/user-management.ts` → `features/user-management/actions/`
3. Move `lib/user-management/*` → `features/user-management/lib/`
4. Move `components/admin/*` → `features/user-management/components/`
5. Update `app/admin/page.tsx` imports

### Phase 5: Update Path Aliases
1. Update `tsconfig.json` path mappings
2. Add `@/features/*` alias
3. Add `@/shared/*` alias
4. Keep `@/app/*` for app router

### Phase 6: Update All Imports
1. Find and replace old import paths
2. Update middleware.ts imports
3. Update db/index.ts if needed
4. Verify no broken imports

### Phase 7: Testing & Verification
1. Run TypeScript compiler
2. Test all functionality
3. Check for any runtime errors
4. Verify database connections work

---

## 🎯 Benefits

### For Developers:
✅ **Easier navigation** - Everything related to a feature is in one place  
✅ **Faster development** - Clear where to add new code  
✅ **Better IDE support** - Co-located code improves autocomplete  
✅ **Reduced cognitive load** - Don't need to remember multiple locations

### For Teams:
✅ **Clear ownership** - Features can be owned by specific team members  
✅ **Parallel development** - Teams can work on different features without conflicts  
✅ **Easier onboarding** - New developers understand structure quickly  
✅ **Better code reviews** - Changes are localized to feature folders

### For Project:
✅ **Scalability** - Easy to add EPIC 7-18 features  
✅ **Maintainability** - Clear boundaries reduce bugs  
✅ **Testability** - Features can be tested in isolation  
✅ **Flexibility** - Easy to extract features into microservices later

---

## 📝 Implementation Checklist

- [ ] Create new directory structure
- [ ] Migrate shared/common code
- [ ] Migrate auth feature module
- [ ] Migrate user-management feature module
- [ ] Update tsconfig.json path aliases
- [ ] Update all import statements
- [ ] Update middleware.ts
- [ ] Run type checking
- [ ] Test authentication flow
- [ ] Test user management flow
- [ ] Verify database connections
- [ ] Update documentation
- [ ] Create migration guide for future features

---

## 🚀 Next Steps

1. Get approval for this architecture
2. Create new branch: `refactor/feature-first-architecture`
3. Implement migration in phases
4. Test thoroughly
5. Create PR with detailed documentation
6. Update CONTRIBUTING.md with new structure guidelines

---

**Status:** ✅ Planning Complete - Ready for Implementation  
**Est. Time:** 2-3 hours for full migration  
**Risk Level:** Medium (requires careful import updates)

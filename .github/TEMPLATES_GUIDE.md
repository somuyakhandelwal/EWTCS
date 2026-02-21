# GitHub Templates & Workflows Guide

This document explains how the issue templates, pull request templates, and automated workflows work in this repository.

---

## 📋 Issue Template

**Location**: `.github/ISSUE_TEMPLATE.md`

### How It Works

When you create a new issue on GitHub, the template automatically appears with pre-filled sections.

### Template Structure

```markdown
## Description
<!-- Provide a clear and concise description of the issue -->

## Acceptance Criteria
<!-- List specific, testable criteria -->
- [ ] 
- [ ] 
- [ ] 

## Area
- [ ] Frontend
- [ ] Backend
- [ ] Documentation
- [ ] DevOps/Infrastructure
- [ ] Testing

## Priority
- [ ] High
- [ ] Medium
- [ ] Low

## Additional Notes
<!-- Any additional context, screenshots, or references -->
```

### How to Use

1. **Go to Issues**: https://github.com/somuyakhandelwal/EWTCS/issues
2. **Click "New Issue"**
3. **Template appears automatically**
4. **Fill in each section**:
   - **Description**: What needs to be done?
   - **Acceptance Criteria**: How do we know it's complete?
   - **Area**: Which part of the codebase?
   - **Priority**: How urgent is it?
   - **Additional Notes**: Any extra context

### Example Issue

```markdown
## Description
Create a bed status grid component that displays all emergency beds in a responsive grid layout.

## Acceptance Criteria
- [ ] Grid displays all beds from database
- [ ] Each bed shows current status with color coding
- [ ] Grid is responsive (mobile, tablet, desktop)
- [ ] Clicking a bed opens detail view

## Area
- [x] Frontend
- [ ] Backend
- [ ] Documentation
- [ ] DevOps/Infrastructure
- [ ] Testing

## Priority
- [x] High
- [ ] Medium
- [ ] Low

## Additional Notes
- Use shadcn/ui Card component
- Refer to PRD.md section 6.1 for requirements
- Color coding: Yellow (Admitted), Orange (Assessment), Blue (Tests), etc.
```

---

## 🔀 Pull Request Template

**Location**: `.github/PULL_REQUEST_TEMPLATE.md`

### How It Works

When you create a pull request, the template automatically appears in the description.

### Template Structure

```markdown
## Description
<!-- Provide a clear description of what this PR does -->

## Linked Issue
Closes #

## Type
- [ ] Feature
- [ ] Bugfix
- [ ] Documentation
- [ ] Refactor
- [ ] Test

## Checklist
- [ ] No file exceeds 200 lines (except lock files: package-lock.json, yarn.lock, pnpm-lock.yaml)
- [ ] Code is properly formatted
- [ ] Tested locally and works as expected
- [ ] Added/updated tests if applicable
- [ ] Updated documentation if needed
- [ ] Screenshots attached (if UI changes)

## Screenshots
<!-- If applicable, add screenshots -->
```

### How to Use

1. **Create a branch**: `git checkout -b feature/issue-1-bed-grid`
2. **Make your changes**
3. **Push to GitHub**: `git push origin feature/issue-1-bed-grid`
4. **Create Pull Request** on GitHub
5. **Template appears automatically**
6. **Fill in each section**:
   - **Description**: What does this PR do?
   - **Linked Issue**: Which issue does it close?
   - **Type**: What kind of change is it?
   - **Checklist**: Verify all items
   - **Screenshots**: Add if UI changes

### Example Pull Request

```markdown
## Description
Implements the bed status grid component with responsive layout and color-coded status indicators.

## Linked Issue
Closes #1

## Type
- [x] Feature
- [ ] Bugfix
- [ ] Documentation
- [ ] Refactor
- [ ] Test

## Checklist
- [x] No file exceeds 200 lines (except lock files: package-lock.json, yarn.lock, pnpm-lock.yaml)
- [x] Code is properly formatted
- [x] Tested locally and works as expected
- [ ] Added/updated tests if applicable
- [x] Updated documentation if needed
- [x] Screenshots attached (if UI changes)

## Screenshots
![Bed Grid Desktop](screenshot-desktop.png)
![Bed Grid Mobile](screenshot-mobile.png)
```

---

## ⚙️ Automated Workflow: 200-Line Check

**Location**: `.github/workflows/code-quality.yml`

### What It Does

Automatically checks that **no file exceeds 200 lines** (except lock/config exclusions like `package-lock.json`) when you create or update a pull request.

### How It Works

1. **Triggers**: When you open/update a PR
2. **Checks**: All changed files in the PR
3. **Excludes**: 
   - Lock files (`package-lock.json`, etc.)
   - Markdown files (`*.md`)
   - JSON files (`*.json`)
   - Images (`*.png`, `*.jpg`, `*.svg`, etc.)
   - GitHub config files (`.github/*`)
4. **Reports**: 
   - ✅ Pass: All files ≤ 200 lines
   - ❌ Fail: One or more files > 200 lines

### Example Output

#### ✅ Passing Check

```
🔍 Checking for files exceeding 200 lines...

📝 Changed files in this PR:
src/components/BedGrid.tsx
src/components/BedCard.tsx
src/lib/utils.ts

✅ src/components/BedGrid.tsx has 145 lines
✅ src/components/BedCard.tsx has 87 lines
✅ src/lib/utils.ts has 52 lines

✅ All files are within the 200-line limit!
```

#### ❌ Failing Check

```
🔍 Checking for files exceeding 200 lines...

📝 Changed files in this PR:
src/components/Dashboard.tsx
src/components/BedCard.tsx

❌ VIOLATION: src/components/Dashboard.tsx has 285 lines (max 200)
✅ src/components/BedCard.tsx has 87 lines

❌ One or more files exceed the 200-line limit

Please split large files into smaller modules:
  • Break down large components into smaller ones
  • Extract utility functions into separate files
  • Separate types into their own files
```

### How to Fix Violations

If your PR fails the 200-line check:

#### Option 1: Split Components

**Before** (285 lines):
```
src/components/Dashboard.tsx
```

**After**:
```
src/components/Dashboard/
  ├── index.tsx          (50 lines)
  ├── Header.tsx         (45 lines)
  ├── BedGrid.tsx        (80 lines)
  ├── Sidebar.tsx        (60 lines)
  └── types.ts           (30 lines)
```

#### Option 2: Extract Utilities

**Before**:
```typescript
// MyComponent.tsx (250 lines)
const MyComponent = () => {
  // Helper functions (100 lines)
  const formatDate = () => { ... }
  const calculateTime = () => { ... }
  const validateInput = () => { ... }
  
  // Component logic (150 lines)
  return <div>...</div>
}
```

**After**:
```typescript
// lib/utils.ts (100 lines)
export const formatDate = () => { ... }
export const calculateTime = () => { ... }
export const validateInput = () => { ... }

// MyComponent.tsx (150 lines)
import { formatDate, calculateTime, validateInput } from '@/lib/utils'

const MyComponent = () => {
  // Component logic only
  return <div>...</div>
}
```

#### Option 3: Separate Types

**Before**:
```typescript
// MyComponent.tsx (220 lines)
interface BedStatus { ... }
interface Patient { ... }
interface TimeLog { ... }
type StageType = ...
// ... more types (50 lines)

const MyComponent = () => { ... } // (170 lines)
```

**After**:
```typescript
// types/bed.ts (50 lines)
export interface BedStatus { ... }
export interface Patient { ... }
export interface TimeLog { ... }
export type StageType = ...

// MyComponent.tsx (170 lines)
import { BedStatus, Patient, TimeLog, StageType } from '@/types/bed'

const MyComponent = () => { ... }
```

---

## 🔄 Complete Workflow Example

### Step 1: Create an Issue

1. Go to: https://github.com/somuyakhandelwal/EWTCS/issues
2. Click "New Issue"
3. Fill in the template:
   ```markdown
   ## Description
   Add authentication system with login/logout
   
   ## Acceptance Criteria
   - [ ] Users can log in with email/password
   - [ ] Session persists across page refreshes
   - [ ] Users can log out
   
   ## Area
   - [x] Backend
   - [ ] Frontend
   
   ## Priority
   - [x] High
   ```
4. Click "Submit new issue" → Issue #5 created

### Step 2: Create a Branch

```bash
git checkout -b feature/issue-5-authentication
```

### Step 3: Make Changes

Create files (keeping each under 200 lines):
```
src/
  ├── app/
  │   └── api/
  │       └── auth/
  │           ├── login/route.ts      (85 lines)
  │           └── logout/route.ts     (45 lines)
  ├── lib/
  │   └── auth.ts                     (120 lines)
  └── types/
      └── auth.ts                     (30 lines)
```

### Step 4: Commit and Push

```bash
git add .
git commit -m "feat: add authentication system (#5)"
git push origin feature/issue-5-authentication
```

### Step 5: Create Pull Request

1. Go to GitHub → Pull Requests → New Pull Request
2. Template appears automatically
3. Fill it in:
   ```markdown
   ## Description
   Implements authentication with login/logout functionality
   
   ## Linked Issue
   Closes #5
   
   ## Type
   - [x] Feature
   
   ## Checklist
   - [x] No file exceeds 200 lines (except lock files: package-lock.json, yarn.lock, pnpm-lock.yaml)
   - [x] Code is properly formatted
   - [x] Tested locally and works as expected
   ```
4. Click "Create pull request"

### Step 6: Automated Check Runs

GitHub Actions automatically:
1. ✅ Checks all changed files
2. ✅ Verifies none exceed 200 lines
3. ✅ Reports success or failure

### Step 7: Review and Merge

1. Reviewer checks the code
2. If approved and checks pass → Merge
3. Issue #5 automatically closes

---

## 🎯 Best Practices

### For Issues

- ✅ **Be specific** in descriptions
- ✅ **List clear acceptance criteria**
- ✅ **Choose appropriate priority**
- ✅ **Add screenshots** if relevant
- ❌ Don't create vague issues

### For Pull Requests

- ✅ **Link to an issue** (use "Closes #X")
- ✅ **Check all checklist items**
- ✅ **Add screenshots** for UI changes
- ✅ **Keep files under 200 lines**
- ❌ Don't submit without testing locally

### For Code

- ✅ **Split large files** into smaller modules
- ✅ **Extract utilities** into separate files
- ✅ **Separate types** from implementation
- ✅ **Use meaningful names**
- ❌ Don't create files over 200 lines

---

## 🚨 Common Issues

### Issue: PR fails 200-line check

**Solution**: Split the file into smaller modules (see "How to Fix Violations" above)

### Issue: Template doesn't appear

**Solution**: 
- For issues: Make sure you're creating a new issue (not a discussion)
- For PRs: Make sure you're creating from a branch (not main)

### Issue: Workflow doesn't run

**Solution**:
- Check that GitHub Actions is enabled in repository settings
- Verify the workflow file is in `.github/workflows/`
- Check that you're creating a PR (not pushing to main)

---

## 📚 Additional Resources

- **GitHub Issues**: https://github.com/somuyakhandelwal/EWTCS/issues
- **Pull Requests**: https://github.com/somuyakhandelwal/EWTCS/pulls
- **Actions**: https://github.com/somuyakhandelwal/EWTCS/actions
- **Contributing Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Questions?** Open an issue or discussion on GitHub!

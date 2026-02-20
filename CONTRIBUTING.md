# Contributing to EWTCS

Thank you for your interest in contributing! This guide will help you get started.

## 🌟 Welcome Contributors

This is a beginner-friendly project. Don't worry if you're new to open source — we're here to help!

## 📋 Contribution Workflow

### Step 1: Find an Issue

1. Browse [open issues](../../issues)
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue to express interest
4. Wait for maintainer assignment before starting work

### Step 2: Fork and Clone

1. **Fork** the repository to your GitHub account
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/EWTCS.git
   cd EWTCS
   ```
3. **Add upstream** remote:
   ```bash
   git remote add upstream https://github.com/somuyakhandelwal/EWTCS.git
   ```

### Step 3: Create a Branch

Create a branch following our naming convention:

```bash
git checkout -b feature/issue-<id>-short-description
```

**Examples:**
- `feature/issue-23-add-color-coding`
- `bugfix/issue-67-fix-timer-bug`
- `docs/issue-12-update-readme`

### Step 4: Make Your Changes

Follow our coding standards (see below).

### Step 5: Commit Your Changes

Write clear, meaningful commit messages:

```bash
git add .
git commit -m "feat: add bed status color coding (#23)"
```

**Commit message format:**
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

### Step 6: Push and Create PR

1. **Push** to your fork:
   ```bash
   git push origin feature/issue-23-add-color-coding
   ```

2. **Create a Pull Request** on GitHub
3. **Fill out the PR template** completely
4. **Link the issue** using "Closes #<issue-number>"
5. **Wait for review** — be patient and responsive to feedback

### Step 7: Address Review Feedback

1. Make requested changes
2. Commit and push updates
3. Request re-review when ready

### Step 8: Merge

Once approved, a maintainer will merge your PR. Congratulations! 🎉

## 📏 Coding Standards

### Project Architecture

This project follows a **Feature-First Hybrid Architecture** for scalability and maintainability:

```
src/
├── app/              # Next.js App Router (routes only)
├── features/         # Feature modules (business logic)
│   ├── auth/
│   ├── user-management/
│   └── ...
└── shared/           # Shared code (used by 2+ features)
    ├── components/
    ├── lib/
    ├── config/
    └── types/
```

**When to use each directory:**

- **`app/`**: Next.js routes and layouts only (minimal logic)
- **`features/`**: Feature-specific code (components, actions, hooks, types)
  - Each feature has: `components/`, `actions/`, `lib/`, `schemas/`, `hooks/`, `types/`
  - Features should be self-contained and independent
- **`shared/`**: Code reused by 2+ features (UI primitives, utilities, config)
  - Shared code should have no feature dependencies

**Import Guidelines:**
- Use TypeScript path aliases: `@/features/*`, `@/shared/*`, `@/app/*`
- Features can import from `@/shared/*` but not from other features
- Shared code should never import from features
- App routes import from both features and shared

For detailed architecture information, see:
- [src/features/README.md](src/features/README.md) - Feature structure guide
- [src/shared/README.md](src/shared/README.md) - Shared code guidelines
- [reports/FEATURE-FIRST-ARCHITECTURE-PLAN.md](reports/FEATURE-FIRST-ARCHITECTURE-PLAN.md) - Complete architecture documentation

### File Size Limit

- **Maximum 200 lines per file** (lock files excluded: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- If a file grows beyond 200 lines, split it into smaller modules
- Use clear file names that indicate purpose

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `bed-status.ts`)
- **Components**: `PascalCase.tsx` (e.g., `BedGrid.tsx`)
- **Functions**: `camelCase` (e.g., `updateBedStatus`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_BEDS`)
- **CSS classes**: `kebab-case` (e.g., `bed-status-card`)

### Code Quality

- **Small functions**: Each function should do one thing well
- **Clear naming**: Use descriptive names, avoid abbreviations
- **Comments**: Add comments for complex logic, not obvious code
- **No dead code**: Remove commented-out code and unused imports
- **Consistent formatting**: Use Prettier (runs automatically)

### Example: Good vs Bad

❌ **Bad:**
```typescript
// This function updates bed
function upd(b, s) {
  b.status = s;
  b.time = new Date();
  return b;
}
```

✅ **Good:**
```typescript
/**
 * Updates the bed status and records the timestamp
 * @param bed - The bed object to update
 * @param newStatus - The new status to set
 * @returns Updated bed object
 */
function updateBedStatus(bed: Bed, newStatus: BedStatus): Bed {
  return {
    ...bed,
    status: newStatus,
    updatedAt: new Date()
  };
}
```

## � Security Guidelines

### Sensitive Data Protection

⚠️ **CRITICAL**: Never commit sensitive information

**❌ DON'T** commit:
- Passwords or API keys
- Database credentials
- SSH keys or tokens
- Customer data or patient information
- Secrets of any kind

**✅ DO** instead:
- Use environment variables for secrets
- Use `.env.local` (which is in `.gitignore`)
- Reference `.env.example` with placeholder values
- Use secret management tools in production
- Document expected environment variables

### Example: Handling Secrets

❌ **Bad:**
```typescript
const DB_PASSWORD = "Kapil@$9215";  // NEVER hardcode!
const API_KEY = "sk-123456789";     // NEVER commit!
```

✅ **Good:**
```typescript
// .env.example
DATABASE_URL=postgresql://user:password@host/db
OPENAI_API_KEY=your_api_key_here

// code
import { env } from '@/lib/config/env';
const dbUrl = env.DATABASE_URL;  // Loaded from .env.local
```

### Database Security

- Never query with string concatenation (SQL injection risk)
- Always use parameterized queries with Zod validation
- Implement proper authentication/authorization middleware
- Log dangerous operations (logins, deletions)
- Use SSL/TLS for database connections in production

### Code Review Security Checks

When reviewing PRs, reviewers will check:

1. **No secrets exposed**: No hardcoded passwords/API keys
2. **Input validation**: All user inputs validated with Zod
3. **SQL injection prevention**: Parameterized queries only
4. **XSS prevention**: Proper escaping of user content
5. **Authentication**: Proper auth middleware in place
6. **Logging**: No sensitive data logged without masking

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **DO** email security concerns to maintainers privately
3. Allow reasonable time for a fix before disclosure
4. Provide detailed reproduction steps

## 🔍 Pull Request Review Process

### What Reviewers Check

1. **Functionality**: Does it work as intended?
2. **Code quality**: Follows coding standards?
3. **File size**: No file exceeds 200 lines (except lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)?
4. **Tests**: Are there tests (if applicable)?
5. **Documentation**: Is it documented?
6. **No breaking changes**: Doesn't break existing features?
7. **Security**: No sensitive data exposed? Proper input validation?

### Review Timeline

- Initial review: Within 48 hours
- Follow-up reviews: Within 24 hours
- Be patient — reviewers are volunteers!

### Responding to Feedback

- Be respectful and professional
- Ask questions if feedback is unclear
- Make requested changes promptly
- Mark conversations as resolved when addressed

## 💬 Communication Rules

### Where to Communicate

- **GitHub Issues**: Bug reports, feature requests, task discussions
- **Pull Requests**: Code review discussions
- **GitHub Discussions**: General questions, ideas, help requests

### Communication Guidelines

- **Be respectful**: Treat everyone with kindness
- **Be clear**: Provide context and details
- **Be patient**: Maintainers are volunteers
- **Be constructive**: Offer solutions, not just criticism
- **Ask questions**: No question is too basic

### Response Times

- Issues: Acknowledged within 48 hours
- PRs: Reviewed within 48 hours
- Questions: Answered within 72 hours

## 🏷️ Issue Labels

Understanding labels helps you find the right issues:

- `good first issue`: Great for beginners
- `help wanted`: We need your help!
- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation improvements
- `frontend`: Frontend-related work
- `backend`: Backend-related work
- `priority: high`: Urgent issues
- `priority: medium`: Important but not urgent
- `priority: low`: Nice to have
- `in progress`: Someone is working on this
- `review needed`: Ready for review
- `blocked`: Waiting on something

## 🚫 What NOT to Do

- ❌ Don't push directly to `main`
- ❌ Don't work on unassigned issues
- ❌ Don't submit PRs without linked issues
- ❌ Don't ignore review feedback
- ❌ Don't submit files over 200 lines (except lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- ❌ Don't include unrelated changes in your PR
- ❌ Don't copy code without attribution

## ✅ Checklist Before Submitting PR

- [ ] Code follows style guidelines
- [ ] No file exceeds 200 lines (except lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- [ ] Self-reviewed my code
- [ ] Commented complex logic
- [ ] Updated documentation
- [ ] No console.log or debug code
- [ ] Tested locally
- [ ] PR template filled out
- [ ] Issue linked in PR

## 🎓 Learning Resources

New to contributing? Check these out:

- [How to Fork a Repo](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
- [Creating a Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)
- [Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🙋 Need Help?

- Comment on the issue you're working on
- Ask in [GitHub Discussions](../../discussions)
- Reach out to maintainers

## 🎉 Recognition

All contributors will be:
- Listed in our [Contributors](../../graphs/contributors) page
- Mentioned in release notes
- Part of our amazing community!

---

Thank you for contributing to EWTCS! Every contribution, no matter how small, makes a difference. 💙

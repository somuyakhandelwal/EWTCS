# Pre-Merge Validation Guide

This document explains the comprehensive pre-merge checks that run automatically on every pull request to ensure nothing fails during setup after merging.

## Overview

Our CI/CD pipeline includes multiple validation jobs that must pass before a PR can be merged:

1. **Environment Validation** - Ensures environment configuration is complete
2. **Database Setup Validation** - Tests database connection and setup
3. **Migration Validation** - Verifies all migrations work correctly
4. **Build Validation** - Ensures the application builds successfully
5. **Dependency Validation** - Checks for security issues and sync
6. **Documentation Validation** - Ensures docs are updated when needed

## Validation Jobs

### 1. Environment Validation

**Purpose**: Ensure all required environment variables are documented and the configuration is complete.

**What it checks**:
- `.env.example` file exists
- All required environment variables are present:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `NODE_ENV`
- No actual secrets in `.env.example` (should use placeholders)
- Environment variables are properly documented

**How to fix failures**:
```bash
# Run validation locally
node scripts/validate-env-example.js

# Add missing variables to .env.example
# Use placeholder values, not real secrets
```

### 2. Database Setup Validation

**Purpose**: Verify that database setup works from scratch on a fresh PostgreSQL instance.

**What it checks**:
- Database connection can be established
- PostgreSQL version is compatible
- Database permissions are sufficient
- Migrations can be applied successfully
- Database schema is correct
- Migration rollback works

**How to fix failures**:
```bash
# Test database connection
node scripts/validate-db-connection.js

# Run migrations
npm run db:migrate

# Validate migrations
node scripts/validate-migrations.js

# Validate schema
node scripts/validate-db-schema.js

# Test rollback
npm run db:rollback
npm run db:migrate
```

### 3. Migration Validation

**Purpose**: Ensure migration files follow best practices and don't cause conflicts.

**What it checks**:
- No existing migration files were modified (only new migrations allowed)
- Migration file naming follows conventions (starts with number)
- No duplicate migration numbers
- All migration files are valid SQL/JS/TS

**Migration Best Practices**:
- ✅ **DO**: Create new migrations for changes
- ✅ **DO**: Test migrations before committing
- ✅ **DO**: Test rollback functionality
- ❌ **DON'T**: Modify existing migrations that have been merged
- ❌ **DON'T**: Delete migration files
- ❌ **DON'T**: Reorder migrations

**How to create a migration**:
```bash
# Create new migration
npm run db:create your_migration_name

# Edit the generated file in migrations/
# Test it
npm run db:migrate

# Test rollback
npm run db:rollback

# Re-apply
npm run db:migrate
```

### 4. Build Validation

**Purpose**: Ensure the application builds successfully in production mode.

**What it checks**:
- TypeScript type checking passes
- Next.js build completes without errors
- Build output directory is created
- No build-time errors

**How to fix failures**:
```bash
# Run type checking
npx tsc --noEmit

# Build the application
npm run build

# Fix any TypeScript or build errors
```

### 5. Dependency Validation

**Purpose**: Ensure dependencies are secure and properly locked.

**What it checks**:
- `package-lock.json` is in sync with `package.json`
- No high or critical security vulnerabilities
- All dependencies can be installed

**How to fix failures**:
```bash
# Sync package-lock.json
npm install

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Commit updated package-lock.json
git add package-lock.json
git commit -m "fix: update dependencies"
```

### 6. Documentation Validation

**Purpose**: Ensure documentation is updated when code changes require it.

**What it checks**:
- Database changes include documentation updates
- README contains setup instructions
- PR description is complete

**When to update documentation**:
- **Database changes** → Update `DATABASE_SETUP.md`
- **New environment variables** → Update `.env.example` and `CONFIGURATION.md`
- **Setup process changes** → Update `README.md`
- **New features** → Update relevant documentation

## Running Checks Locally

Before pushing your PR, run these checks locally to catch issues early:

### Quick Check (Recommended)
```bash
# Run all validation scripts
npm run validate:all
```

### Individual Checks
```bash
# Environment validation
node scripts/validate-env-example.js

# Database connection
node scripts/validate-db-connection.js

# Migrations
node scripts/validate-migrations.js

# Schema
node scripts/validate-db-schema.js

# Build
npm run build

# Dependencies
npm audit
```

### Full Local Test
```bash
# Complete setup test (simulates fresh install)
./scripts/test-fresh-setup.sh
```

## Common Issues and Solutions

### Issue: "DATABASE_URL is not set"
**Solution**: Create `.env.local` with required variables:
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### Issue: "Pending migrations detected"
**Solution**: Apply all migrations:
```bash
npm run db:migrate
```

### Issue: "Migration file was modified"
**Solution**: Never modify existing migrations. Create a new migration instead:
```bash
npm run db:create fix_previous_migration
```

### Issue: "package-lock.json out of sync"
**Solution**: Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: sync package-lock.json"
```

### Issue: "Build failed - TypeScript errors"
**Solution**: Fix TypeScript errors:
```bash
npx tsc --noEmit
# Fix reported errors
```

### Issue: "Security vulnerabilities found"
**Solution**: Update vulnerable packages:
```bash
npm audit fix
# Or manually update specific packages
npm update <package-name>
```

## PR Checklist

Before submitting your PR, ensure:

### Code Quality
- [ ] No file exceeds 200 lines
- [ ] Code is properly formatted
- [ ] TypeScript types are properly defined
- [ ] No ESLint errors or warnings

### Testing
- [ ] Tested locally and works as expected
- [ ] Added/updated tests if applicable
- [ ] All existing tests pass

### Database & Environment
- [ ] Database migrations tested (if applicable)
- [ ] Migration rollback tested (if applicable)
- [ ] Environment variables documented in `.env.example` (if new vars added)
- [ ] Database schema changes documented (if applicable)
- [ ] No modifications to existing migration files

### Documentation
- [ ] Updated documentation if needed
- [ ] README updated (if setup process changed)
- [ ] DATABASE_SETUP.md updated (if database changes)
- [ ] Code comments added for complex logic

## Automated vs Manual Checks

### Automated (CI/CD)
These run automatically on every PR:
- Environment validation
- Database setup test
- Migration validation
- Build validation
- Dependency security scan
- Documentation check

### Manual (Developer Responsibility)
These should be done before pushing:
- Local testing
- Code review
- Feature testing
- UI/UX testing
- Performance testing

## Troubleshooting CI Failures

### Check GitHub Actions Logs
1. Go to your PR on GitHub
2. Click "Checks" tab
3. Click on the failed job
4. Review the error logs

### Reproduce Locally
```bash
# Use the same commands that CI runs
# See .github/workflows/pre-merge-checks.yml

# Example: Reproduce database validation
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=testpassword \
  -e POSTGRES_DB=ewtcs_test \
  postgres:15

# Update .env.local with test database
# Run validation scripts
node scripts/validate-db-connection.js
npm run db:migrate
node scripts/validate-migrations.js
```

### Get Help
If you're stuck:
1. Check this documentation
2. Review similar merged PRs
3. Ask in team chat
4. Tag a maintainer in your PR

## Best Practices

### Before Starting Work
1. Pull latest changes from main
2. Create a feature branch
3. Ensure local setup works

### During Development
1. Run validation scripts frequently
2. Test migrations immediately after creating them
3. Keep files under 200 lines
4. Update documentation as you go

### Before Submitting PR
1. Run all validation scripts locally
2. Test fresh setup if possible
3. Review your own code
4. Complete PR checklist
5. Write clear PR description

### After PR Feedback
1. Address all review comments
2. Re-run validation scripts
3. Test changes thoroughly
4. Update PR description if needed

## Additional Resources

- [DATABASE_SETUP.md](../DATABASE_SETUP.md) - Database setup guide
- [CONFIGURATION.md](../CONFIGURATION.md) - Configuration guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [README.md](../README.md) - Project overview and setup

## Questions?

If you have questions about pre-merge checks:
1. Review this documentation
2. Check existing issues/PRs
3. Ask in team discussions
4. Contact maintainers

---

**Remember**: These checks exist to prevent setup failures and ensure code quality. They save time by catching issues before they reach production!

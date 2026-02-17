# Pre-Merge Validation System

## 🎯 Quick Reference

### Run Before Every PR
```bash
npm run validate:all
```

### Individual Checks
```bash
npm run validate:env          # ✅ Environment variables
npm run validate:db           # ✅ Database connection
npm run validate:migrations   # ✅ Migration status
npm run validate:schema       # ✅ Database schema
```

### Comprehensive Test
```bash
./scripts/test-fresh-setup.sh  # ✅ Complete fresh setup simulation
```

---

## 📊 Validation Coverage

| Check | What It Validates | When It Runs |
|-------|------------------|--------------|
| **Environment** | .env.example completeness, no real secrets | Every PR + Manual |
| **Database Connection** | PostgreSQL connectivity, version, permissions | Every PR + Manual |
| **Migrations** | All applied, no modifications, proper naming | Every PR + Manual |
| **Schema** | Tables exist, correct structure, constraints | Every PR + Manual |
| **Build** | TypeScript types, Next.js build succeeds | Every PR + Manual |
| **Dependencies** | No vulnerabilities, package-lock.json sync | Every PR + Manual |
| **Documentation** | Docs updated for DB/env changes | Every PR |

---

## 🚀 Automated CI/CD Checks

Every pull request automatically runs:

1. ✅ **Environment Validation** (30 seconds)
2. ✅ **Database Setup Validation** (2 minutes)
3. ✅ **Migration Validation** (30 seconds)
4. ✅ **Build Validation** (2 minutes)
5. ✅ **Dependency Validation** (1 minute)
6. ✅ **Documentation Validation** (30 seconds)

**Total Time**: ~6 minutes

---

## 📝 Enhanced PR Checklist

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
- [ ] Environment variables documented in .env.example (if new vars added)
- [ ] Database schema changes documented (if applicable)
- [ ] No modifications to existing migration files

### Documentation
- [ ] Updated documentation if needed
- [ ] README updated (if setup process changed)
- [ ] DATABASE_SETUP.md updated (if database changes)
- [ ] Code comments added for complex logic

---

## 🛠️ Files Created

### GitHub Actions
- `.github/workflows/pre-merge-checks.yml` - Automated CI/CD validation

### Validation Scripts
- `scripts/validate-env-example.js` - Environment validation
- `scripts/validate-db-connection.js` - Database connection test
- `scripts/validate-migrations.js` - Migration validation
- `scripts/validate-db-schema.js` - Schema validation
- `scripts/test-fresh-setup.sh` - Complete setup test

### Documentation
- `PRE_MERGE_VALIDATION.md` - Comprehensive validation guide
- `VALIDATION_IMPLEMENTATION_SUMMARY.md` - Implementation details
- Updated `README.md` - Added validation section
- Updated `.github/PULL_REQUEST_TEMPLATE.md` - Enhanced checklist

---

## 🎓 For New Contributors

### First Time Setup
1. Clone repository
2. Run `npm install`
3. Copy `.env.example` to `.env.local`
4. Configure database credentials
5. Run `npm run validate:all`

### Before Every PR
1. Make your changes
2. Run `npm run validate:all`
3. Fix any issues
4. Submit PR
5. Wait for CI checks to pass

---

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "DATABASE_URL is not set" | Create `.env.local` from `.env.example` |
| "Pending migrations detected" | Run `npm run db:migrate` |
| "Migration file was modified" | Create new migration instead |
| "package-lock.json out of sync" | Run `npm install` and commit |
| "Build failed - TypeScript errors" | Run `npx tsc --noEmit` and fix errors |
| "Security vulnerabilities found" | Run `npm audit fix` |

---

## 📚 Documentation Links

- **[PRE_MERGE_VALIDATION.md](PRE_MERGE_VALIDATION.md)** - Complete validation guide
- **[VALIDATION_IMPLEMENTATION_SUMMARY.md](VALIDATION_IMPLEMENTATION_SUMMARY.md)** - Implementation details
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Database setup guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

---

## ✨ Benefits

### For Developers
- ✅ Catch issues before pushing
- ✅ Clear error messages
- ✅ Faster PR reviews
- ✅ Confidence in changes

### For the Project
- ✅ No setup failures after merge
- ✅ Consistent quality
- ✅ Secure dependencies
- ✅ Complete documentation

---

**💡 Pro Tip**: Run `npm run validate:all` frequently during development to catch issues early!

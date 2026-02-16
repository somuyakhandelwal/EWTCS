# Documentation Structure & Guidelines

**Project:** Emergency Ward Bed Status & AI Daily Report System (EWTCS)  
**Last Updated:** February 16, 2026

---

## 📁 Documentation Organization

Our documentation follows a **structured, consistent format** to ensure clarity and maintainability:

### **Root Level Documentation**
Core project documentation that all contributors should read:

```
EWTCS/
├── README.md                      # Project overview, quick start, roadmap
├── PRD.md                         # Product Requirements Document
├── EPICS.md                       # All project EPICs
├── USER_STORIES.md                # Detailed user stories
├── CONFIGURATION.md               # Environment & deployment setup
├── CONTRIBUTING.md                # Contribution guidelines
├── CODE_OF_CONDUCT.md             # Community standards
└── CHANGELOG.md                   # Version history (future)
```

### **Reports Directory** (`reports/`)
Implementation reports and technical deep-dives:

```
reports/
├── README.md                                  # Index of all reports
├── US-X.Y-IMPLEMENTATION-REPORT.md            # User story reports
├── FEATURE-FIRST-ARCHITECTURE-PLAN.md         # Architecture design
└── PR-DESCRIPTION.md                          # PR templates
```

### **Docs Directory** (`docs/`)
User-facing documentation and guides:

```
docs/
├── US-X.Y_FEATURE-NAME.md         # Feature-specific docs
└── guides/                        # How-to guides (future)
```

### **Source Code Documentation** (`src/`)
In-code documentation:

```
src/
├── features/README.md             # Feature module guidelines
├── shared/README.md               # Shared utilities guide
└── features/<feature>/README.md   # Per-feature documentation
```

---

## 📝 Documentation Standards

### **1. README.md Structure**

The main README.md follows this **fixed structure** (do NOT modify section order):

```markdown
# Project Title & Tagline

[Badges]

---

## 📋 Problem & Solution
## 🎯 Project Goals
## 🔧 Technology Stack
## 🚀 Getting Started
## 📁 Project Structure
## 🎨 Bed Status Stages (domain-specific)
## 🔧 Available Commands
## 🌐 Configuration
## 📚 Documentation
## 🗺️ Roadmap
## 🤝 Contributing
## 🐛 Bug Reports & Feature Requests
## 📞 Support & Discussion
## 🙏 Acknowledgments
## 🏗️ Architecture Highlights
```

**Rules:**
- ✅ Update sections as features complete
- ✅ Keep roadmap current with checkboxes
- ✅ Add new documentation links to the "📚 Documentation" section
- ❌ Do NOT add code snippets to bottom of README
- ❌ Do NOT duplicate sections
- ❌ Do NOT reorder sections

---

### **2. Implementation Report Structure**

All user story implementation reports follow this template:

```markdown
# US-X.Y: [Feature Name] - Implementation Report

**Issue**: US-X.Y - [Feature Name]
**Epic**: EPIC X - [Epic Name]
**Status**: ✅ **COMPLETED**
**Story Points**: [Points]
**Priority**: P[0-3]
**Completion Date**: [Date]

---

## 📋 Overview
Brief summary (2-3 sentences)

---

## ✅ Acceptance Criteria - All Met
Table format showing each criterion and implementation

---

## 🏗️ Implementation Details

### 1. Database Schema
### 2. Feature Module Structure
### 3. Core Features Implemented
### 4. Performance Optimizations
### 5. Database Seed Scripts

---

## 🧪 Testing Performed
### Manual Testing Checklist
### Browser Compatibility
### Build Verification

---

## 📸 Screenshots & Visual Examples
Text-based diagrams or descriptions

---

## 🔧 Technical Decisions
Architecture choices and rationale

---

## 📈 Performance Metrics
Load times, bundle sizes, query performance

---

## 🐛 Known Issues & Future Improvements
### Known Limitations
### Future Enhancements (Planned)

---

## 📚 Related Documentation
Links to related docs

---

## 🚀 Deployment Notes
Prerequisites, migration commands, checklist

---

## 👥 Team Members
Who worked on this

---

## 📝 Changelog
Version history for this feature

---

**Implementation Status**: ✅ **COMPLETE & PRODUCTION READY**
```

**Location:** `reports/US-X.Y-IMPLEMENTATION-REPORT.md`

---

### **3. Feature Documentation** (`src/features/<feature>/README.md`)

Optional per-feature documentation for complex features:

```markdown
# [Feature Name]

**Epic:** EPIC X
**Status:** [In Progress | Complete]

## Purpose
What problem does this feature solve?

## Structure
Directory tree

## Key Components
Brief description of main files

## Usage Examples
Code snippets showing how to use the feature

## Related User Stories
- US-X.Y - [Story Name]

## Testing
How to test this feature
```

---

## 🔄 Documentation Update Process

When completing a user story:

### **Step 1: Create Implementation Report**
```bash
# Create report in reports/
reports/US-X.Y-IMPLEMENTATION-REPORT.md
```

Use the template above. Include:
- ✅ All acceptance criteria with proof
- ✅ Database changes (migrations, schemas)
- ✅ Feature structure (files created/modified)
- ✅ Testing evidence
- ✅ Performance metrics
- ✅ Deployment instructions

### **Step 2: Update reports/README.md**
Add entry to the reports index:

```markdown
### EPIC X: [Epic Name]
- **[US-X.Y-IMPLEMENTATION-REPORT.md](US-X.Y-IMPLEMENTATION-REPORT.md)** - [Feature Name]
  - Status: ✅ Complete ([Date])
  - [Brief description]
```

### **Step 3: Update Main README.md**

**3a. Update Roadmap Section**
Mark completed items with `[x]`:

```markdown
### Phase N: [Phase Name]
- [x] **Feature name (US-X.Y)** ✨ NEW  # Add ✨ NEW for recent completions
```

**3b. Update Completed Progress Section**
Add bullet point with details:

```markdown
**✅ Completed (Phase N):**
- **Feature Name (US-X.Y)** ✨ NEW
  - Bullet point 1
  - Bullet point 2
```

**3c. Update Documentation Section**
Add link to implementation report:

```markdown
### Implementation Reports
- **[US-X.Y Report](reports/US-X.Y-IMPLEMENTATION-REPORT.md)** - [Feature Name]
```

### **Step 4: Verify**
```bash
# Check all links work
npm run build

# Review documentation
git diff README.md
git diff reports/
```

---

## ❌ Common Mistakes to Avoid

### **DON'T:**
1. ❌ Add code examples to bottom of README.md
2. ❌ Create duplicate sections in README.md
3. ❌ Put implementation details in main README (use reports/)
4. ❌ Leave stale checkboxes in roadmap
5. ❌ Skip the implementation report
6. ❌ Create reports in root directory (use reports/)
7. ❌ Forget to update the reports/README.md index

### **DO:**
1. ✅ Follow the template structure exactly
2. ✅ Keep README.md high-level and scannable
3. ✅ Put detailed documentation in reports/
4. ✅ Update all 3 locations (report, reports/README, main README)
5. ✅ Mark recent items with ✨ NEW emoji
6. ✅ Include testing evidence in reports
7. ✅ Add performance metrics
8. ✅ Link related documentation

---

## 📊 Documentation Checklist

Use this checklist for every completed user story:

```markdown
### US-X.Y Documentation Checklist

Implementation Report:
- [ ] Created reports/US-X.Y-IMPLEMENTATION-REPORT.md
- [ ] Filled all template sections
- [ ] Included acceptance criteria table
- [ ] Added database schema details
- [ ] Listed all files created/modified
- [ ] Documented testing performed
- [ ] Added performance metrics
- [ ] Included deployment notes

Reports Index:
- [ ] Added entry to reports/README.md
- [ ] Included status and completion date
- [ ] Added brief description

Main README:
- [ ] Updated roadmap checkboxes
- [ ] Added to completed progress section with ✨ NEW
- [ ] Added link in Documentation section
- [ ] Verified no duplicate sections
- [ ] Verified no code snippets at bottom

Verification:
- [ ] All documentation links work
- [ ] Build passes (npm run build)
- [ ] No TypeScript errors
- [ ] Git diff reviewed
```

---

## 🎯 Current Documentation Status

### ✅ Completed Reports
- **US-5.3**: User Management (Admin) - [Report](reports/US-5.3-IMPLEMENTATION-REPORT.md)
- **US-1.1**: View All Emergency Beds in Grid Layout - [Report](reports/US-1.1-IMPLEMENTATION-REPORT.md) ✨ NEW

### 📝 Documentation Health
- ✅ README.md structure: Clean & organized
- ✅ Reports directory: Properly indexed
- ✅ Roadmap: Up to date
- ✅ Implementation reports: Following template
- ✅ No duplicate sections
- ✅ No stale content

---

## 📞 Questions?

If you're unsure about documentation structure:
1. Check existing reports as examples (US-1.1, US-5.3)
2. Follow the templates in this guide
3. Ask in team discussions

**Remember:** Good documentation is as important as good code! 📚

---

**Last Updated:** February 16, 2026  
**Maintained By:** EWTCS Team

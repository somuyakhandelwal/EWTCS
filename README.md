# Emergency Ward Bed Status Monitoring & AI Daily Report System (EWTCS)

> A real-time digital dashboard for hospital emergency ward management that enables nurses to track bed status with one-click updates, automatic time tracking, and AI-generated daily performance reports.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Problem & Solution

**The Problem:**
Emergency wards lack real-time visibility into patient progress. Manual tracking, no operational intelligence, and no automated reporting lead to delays and poor accountability.

- ✅ Color-coded visual alerts
- ✅ AI-generated daily summaries
### For Nurses
- **Visual Dashboard**: Color-coded grid showing all emergency beds
- **No Typing Required**: Simple, intuitive interface

### For Supervisors
### For Management
- **Daily AI Reports**: Automated performance summaries
---

- **[Next.js 15.5](https://nextjs.org/)** - React framework with App Router
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible components
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
**Our Solution:**
A simple, intuitive dashboard that provides:
- ✅ Real-time bed status visibility
- ✅ One-click status updates (no typing)
- ✅ Automatic time tracking per patient
- ✅ Color-coded visual alerts
- ✅ Automated daily performance reports

**For Nurses:** Visual dashboard with color-coded beds and simple buttons  
**For Supervisors:** Monitor delayed beds and enforce compliance  
**For Management:** Daily AI-powered summaries and performance metrics  

---

## 🎯 Project Goals

1. **Reduce patient wait times** by improving visibility
2. **Increase accountability** through automatic tracking
3. **Enable data-driven decisions** with AI-powered insights
4. **Improve emergency ward efficiency** without disrupting existing workflows

---

## 🔧 Technology Stack

### Frontend
- **Next.js 15.5** - React framework with App Router
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Static type checking

### Backend
- **Next.js API Routes** - RESTful endpoints
- **Server Actions** - Server-side mutations
- **ESLint** - Code linting

### Database & Infrastructure
- **PostgreSQL 14+** - Relational database
- **node-pg-migrate** - Version-controlled schema migrations
- **Automated migrations** - Deploy-time schema updates

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- npm/yarn/pnpm

### Installation

1. **Clone & install**
   ```bash
   git clone https://github.com/somuyakhandelwal/EWTCS.git
   cd EWTCS && npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit DATABASE_URL and NEXT_PUBLIC_APP_URL in .env.local
   ```

3. **Run database setup**
   ```bash
   # Create database
   createdb ewtcs
   
   # Run migrations (coming soon)
   npm run db:migrate
   # Seed initial data (coming soon)
   npm run db:seed
   npm run db:migrate  # Apply schema migrations
   npm run db:seed     # Seed initial data
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
EWTCS/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utility functions & config
│   └── types/            # TypeScript type definitions
├── migrations/           # Database migrations (version-controlled)
├── scripts/              # Utility scripts (migrations, seeding, reset)
└── public/               # Static assets
```

---

## 🎨 Bed Status Stages

The system tracks patients through 6 stages with color-coded indicators:

| Stage | Color | Description |
|-------|-------|-------------|
| **1. Patient Admitted** | 🟡 Yellow | Patient has arrived |
| **2. Under Assessment** | 🟠 Orange | Initial examination in progress |
| **3. Tests Ordered** | 🔵 Blue | Diagnostic tests requested |
| **4. Awaiting Results** | 🟣 Purple | Waiting for test results |
| **5. Decision Made** | 🟢 Green | Treatment plan decided |
| **6. Discharged/Transferred** | ⚪ Grey | Patient has left |
| **⚠️ Time > 3 hours** | 🔴 Red | Automatic alert for delays |

---

## 🔧 Available Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server (runs migrations automatically)
npm run lint         # Run ESLint
```

### Database Management
```bash
npm run db:migrate   # Apply pending migrations with single transaction
npm run db:rollback  # Revert the last migration
npm run db:status    # Show applied and pending migrations
npm run db:create    # Create a new timestamped migration file
npm run db:seed      # Seed initial test data
npm run db:reset     # Drop and recreate schema (development only)
```

Migration details and best practices: See [CONFIGURATION.md#migrations](CONFIGURATION.md#migrations)

---

## 🌐 Configuration

### Environment Variables (Quick Setup)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ewtcs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### For Production
Use encrypted secrets via `DATABASE_URL_ENCRYPTED` and `ENCRYPTION_KEY`.

Full environment variable reference: See [CONFIGURATION.md](CONFIGURATION.md)

---

## 📚 Documentation

- **[PRD.md](PRD.md)** - Complete Product Requirements Document
- **[CONFIGURATION.md](CONFIGURATION.md)** - Detailed environment setup, migrations, and deployment
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines and coding standards
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community guidelines

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- [ ] Database schema design ✅
- [ ] Automated migrations ✅
- [ ] Authentication system
- [ ] Bed status grid component
- [ ] One-click stage updates
- [ ] Color-coded visual indicators
- [ ] Automatic time tracking

### Phase 2: Analytics
- [ ] Daily AI summary generator
- [ ] Management dashboard
- [ ] Performance metrics
- [ ] Exportable reports (PDF/CSV)

### Phase 3: Advanced Features
- [ ] Lab/Radiology integration
- [ ] Mobile app for doctors
- [ ] Predictive analytics
- [ ] Multi-department support

---

## 🚦 Project Status

🟢 **Active Development - MVP Phase**

**Completed:**
- ✅ Repository & Next.js setup
- ✅ Database schema & migrations
- ✅ Environment configuration & validation
- ✅ Health check endpoint

**In Progress:**
- 🔄 Authentication & role-based access
- 🔄 Bed grid UI & status updates
- 🔄 Time tracking & logging

**Pending:**
- ⏳ Daily reports & AI summaries
- ⏳ Management dashboards

---

## 🤝 Contributing

Use the provided templates for each environment:

- .env.example (general template)
- .env.development
- .env.staging
- .env.production

Create a `.env.local` file in the root directory:

```env
# Database (plaintext allowed in dev/staging)
DATABASE_URL=postgresql://username:password@localhost:5432/ewtcs
We welcome contributions! This is a healthcare project that can make a real difference.

### Quick Start for Contributors

1. **Fork** this repository
2. **Create a branch**: `git checkout -b feature/issue-<id>-description`
3. **Make your changes** following our coding standards
4. **Test locally**: `npm run dev`
5. **Commit**: `git commit -m "feat: add feature description"`
6. **Push**: `git push origin feature/issue-<id>-description`
7. **Submit a Pull Request**

### Coding Standards

- ✅ TypeScript required for all new code
- ✅ Functional components with hooks
- ✅ Tailwind CSS via shadcn/ui
- ✅ Descriptive, meaningful names
- ✅ Documentation for complex logic
- ✅ Tests for new features (when test suite is available)

# Environment
NODE_ENV=development
# Security (Required)
SESSION_SECRET=your_super_secret_key_at_least_32_chars_long

# AI/Analytics (Optional - for future use)
# OPENAI_API_KEY=your_api_key_here
```


### Branch Naming Convention

```
feature/issue-<id>-short-description
bugfix/issue-<id>-short-description
docs/issue-<id>-short-description
```

For complete guidelines: See [CONTRIBUTING.md](CONTRIBUTING.md)

For production, use encrypted secrets instead of plaintext values:

```env
DATABASE_URL_ENCRYPTED=ivhex:encryptedhex
ENCRYPTION_KEY=your-32-byte-master-key
```

See CONFIGURATION.md for full details.

---

## 🐛 Bug Reports & Feature Requests

Found a bug or have an idea?

1. Check [existing issues](https://github.com/somuyakhandelwal/EWTCS/issues)
2. Create a [new issue](https://github.com/somuyakhandelwal/EWTCS/issues/new)
3. Use the issue template
4. Provide clear steps to reproduce or detailed context

---

## 📞 Support & Discussion

- **Issues**: [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues) - Bug reports and feature requests
- **Discussions**: [GitHub Discussions](https://github.com/somuyakhandelwal/EWTCS/discussions) - Questions and ideas
- **Email**: [somuyakhandelwal@gmail.com](mailto:somuyakhandelwal@gmail.com)

---

## 🙏 Acknowledgments

- **JMCH Medical College & Hospital** - For the opportunity to improve emergency ward efficiency
- **Contributors** - Thank you to everyone who contributes
- **Open Source Community** - For amazing tools and libraries

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Made with ❤️ for better healthcare**

---

## 🚦 Project Status

🟢 **Active Development** - We're currently building the MVP

- ✅ Repository setup complete
- ✅ Next.js project initialized
- ✅ Database client configured
- 🔄 Database schema in progress
- 🔄 UI components in progress
- ✅ Authentication system
- ✅ Dashboard (Nurse View)
- [ ] Bed status grid component
- [ ] One-click stage updates
- [ ] Color-coded visual indicators
- [ ] Automatic time tracking

---

**Star ⭐ this repository if you find it useful!**

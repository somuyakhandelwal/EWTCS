# Emergency Ward Bed Status Monitoring & AI Daily Report System (EWTCS)

> A real-time digital dashboard for hospital emergency ward management that enables nurses to track bed status with one-click updates, automatic time tracking, and AI-generated daily performance reports.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Overview

EWTCS is a hospital management system designed for JMCH Medical College & Hospital to improve emergency ward efficiency through real-time visibility, accountability, and automated reporting. The system focuses on **visibility, discipline, and reporting** — not replacing existing hospital systems.

### Key Problems Solved
- ❌ No real-time visibility of patient progress
- ❌ Manual tracking of bed usage
- ❌ Lack of operational intelligence
- ❌ No automated reporting

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

### Backend
- **Next.js API Routes** - RESTful API endpoints
- **Server Actions** - Server-side mutations
- **ESLint** - Code linting
- **TypeScript** - Static type checking

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 18.x or higher
- **npm** or **yarn** or **pnpm**
- **PostgreSQL** 14.x or higher
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/somuyakhandelwal/EWTCS.git
   cd EWTCS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and configure:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/ewtcs
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb ewtcs
   
   # Run migrations (coming soon)
   npm run db:migrate
   # Seed initial data (coming soon)
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
EWTCS/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   ├── components/             # React components (to be created)
│   ├── lib/                    # Utility functions (to be created)
│   └── types/                  # TypeScript types (to be created)
├── public/                     # Static assets
├── .github/                    # GitHub templates
│   ├── ISSUE_TEMPLATE.md
│   └── PULL_REQUEST_TEMPLATE.md
├── .env.example                # Environment variables template
├── CODE_OF_CONDUCT.md          # Community guidelines
├── CONTRIBUTING.md             # Contribution guide
├── PRD.md                      # Product Requirements Document
└── README.md                   # This file
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

## 🤝 Contributing

We welcome contributions from developers of all skill levels! This is a healthcare project that can make a real difference.

### Quick Start for Contributors

1. **Fork** this repository
2. **Create a branch**: `git checkout -b feature/issue-<id>-description`
3. **Make your changes** following our coding standards
4. **Test locally**: `npm run dev`
5. **Commit**: `git commit -m "feat: add feature description"`
6. **Push**: `git push origin feature/issue-<id>-description`
7. **Submit a Pull Request**

### Coding Standards

- ✅ **TypeScript**: All new code must be TypeScript
- ✅ **Components**: Use functional components with hooks
- ✅ **Styling**: Use Tailwind CSS classes via shadcn/ui
- ✅ **Naming**: Use descriptive, meaningful names
- ✅ **Comments**: Document complex logic
- ✅ **Testing**: Write tests for new features (when test suite is set up)

### Branch Naming Convention

```
feature/issue-<id>-short-description
bugfix/issue-<id>-short-description
docs/issue-<id>-short-description
```

**Examples:**
- `feature/issue-1-bed-status-grid`
- `bugfix/issue-12-timer-reset`
- `docs/issue-5-api-documentation`

For detailed guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📚 Documentation

- **[PRD.md](PRD.md)** - Complete Product Requirements Document
- **[CONFIGURATION.md](CONFIGURATION.md)** - Environment configuration and security guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community standards

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- [ ] Database schema design
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

## 🔧 Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database (Coming Soon)
```bash
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed initial data
npm run db:reset     # Reset database
```

---

## 🌐 Environment Variables

Use the provided templates for each environment:

- .env.example (general template)
- .env.development
- .env.staging
- .env.production

Create a `.env.local` file in the root directory:

```env
# Database (plaintext allowed in dev/staging)
DATABASE_URL=postgresql://username:password@localhost:5432/ewtcs

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment
NODE_ENV=development
# Security (Required)
SESSION_SECRET=your_super_secret_key_at_least_32_chars_long

# AI/Analytics (Optional - for future use)
# OPENAI_API_KEY=your_api_key_here
```

For production, use encrypted secrets instead of plaintext values:

```env
DATABASE_URL_ENCRYPTED=ivhex:encryptedhex
ENCRYPTION_KEY=your-32-byte-master-key
```

See CONFIGURATION.md for full details.

---

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please create an issue:

1. Go to [Issues](https://github.com/somuyakhandelwal/EWTCS/issues)
2. Click "New Issue"
3. Use the issue template
4. Provide detailed information

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **JMCH Medical College & Hospital** - For the opportunity to improve emergency ward efficiency
- **Contributors** - Thank you to everyone who contributes to this project
- **Open Source Community** - For the amazing tools and libraries

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/somuyakhandelwal/EWTCS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/somuyakhandelwal/EWTCS/discussions)
- **Email**: [somuyakhandelwal@gmail.com](mailto:somuyakhandelwal@gmail.com)

---

## 🎯 Project Goals

1. **Reduce patient wait times** by improving visibility
2. **Increase accountability** through automatic tracking
3. **Enable data-driven decisions** with AI-powered insights
4. **Improve emergency ward efficiency** without disrupting existing workflows

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

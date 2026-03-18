import { Activity, Brain, Bell, ShieldCheck, BarChart3, Users } from "lucide-react"

export const features = [
  {
    Icon: Activity,
    title: "Real-Time Bed Dashboard",
    description:
      "Color-coded grid of 12+ emergency beds across an 8-stage patient workflow. One-click status updates, elapsed time tracking, delay detection, and bed history modals.",
  },
  {
    Icon: Brain,
    title: "AI-Powered Daily Reports",
    description:
      "Google Gemini integration generates human-readable daily summaries, performance insights, and bottleneck analysis — automatically at midnight or triggered on demand.",
  },
  {
    Icon: Bell,
    title: "Supervisor Alert Center",
    description:
      "Unified feed of stage delays, escalations, disposition bottlenecks and system errors — severity-sorted, auto-refreshing every 30 seconds with one-click acknowledgement.",
  },
  {
    Icon: ShieldCheck,
    title: "Audit & Compliance",
    description:
      "Immutable audit trail on every action. Report sign-offs, stage correction logs, and a dedicated read-only Auditor role designed for full regulatory compliance.",
  },
  {
    Icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Stage duration statistics, turnaround time (TAT) analysis, bed timeline visualization, bottleneck identification, and full CSV export for offline reporting.",
  },
  {
    Icon: Users,
    title: "Role-Based Access Control",
    description:
      "Four purpose-built roles — Nurse, Supervisor, Admin, and Auditor — with JWT-secured sessions, shift management, and individual ward access policies.",
  },
]

export const roles = [
  {
    role: "Nurse",
    colorText: "text-blue-500",
    colorBg: "bg-blue-500/10",
    colorBorder: "border-blue-500/20",
    points: [
      "Color-coded bed grid overview",
      "One-click stage updates",
      "Bed history & transition log",
      "Search & filter beds",
    ],
  },
  {
    role: "Supervisor",
    colorText: "text-amber-500",
    colorBg: "bg-amber-500/10",
    colorBorder: "border-amber-500/20",
    points: [
      "Unified alert screen",
      "Override restricted transitions",
      "AI summary dashboard",
      "Report sign-off",
    ],
  },
  {
    role: "Administrator",
    colorText: "text-emerald-500",
    colorBg: "bg-emerald-500/10",
    colorBorder: "border-emerald-500/20",
    points: [
      "User & role management",
      "Bed & stage configuration",
      "System health monitoring",
      "Security scanning & retention",
    ],
  },
  {
    role: "Auditor",
    colorText: "text-purple-500",
    colorBg: "bg-purple-500/10",
    colorBorder: "border-purple-500/20",
    points: [
      "Read-only full access",
      "Complete audit trail view",
      "Stage history with filters",
      "CSV export for compliance",
    ],
  },
]

export const stats = [
  { value: "12+", label: "Emergency Beds" },
  { value: "8", label: "Workflow Stages" },
  { value: "4", label: "User Roles" },
  { value: "AI", label: "Powered Reports" },
]

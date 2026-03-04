import type { HelpContext } from '@/features/help/types/help'

export const DEFAULT_HELP_CONTEXT: HelpContext = {
  routeKey: 'default',
  pageTitle: 'Help',
  summary: 'Use this panel to quickly understand the current screen and key actions.',
  tips: [
    {
      id: 'default-1',
      title: 'Open user manual',
      description: 'Use the User Manual link for complete workflows and screenshots.',
    },
    {
      id: 'default-2',
      title: 'Follow guided tour',
      description: 'Use Start Tour to walk through important controls on this page.',
    },
  ],
  tour: [],
}

export const HELP_CONTEXTS: HelpContext[] = [
  {
    routeKey: '/admin/beds',
    pageTitle: 'Bed Management Help',
    summary: 'Manage bed inventory, status, and ward assignment for operational readiness.',
    tips: [
      { id: 'beds-1', title: 'Edit carefully', description: 'Bed setup changes affect dashboard visibility and reporting.' },
      { id: 'beds-2', title: 'Use ward assignment', description: 'Verify each bed is mapped to the correct ward before saving.' },
    ],
    tour: [
      { id: 'beds-tour-1', title: 'Beds Header', description: 'Use this section for admin context and navigation.', selector: '[data-help-id="admin-beds-header"]' },
      { id: 'beds-tour-2', title: 'Beds Table', description: 'Manage bed records and operational attributes here.', selector: '[data-help-id="admin-beds-table"]' },
    ],
  },
  {
    routeKey: '/admin/stages',
    pageTitle: 'Stage Configuration Help',
    summary: 'Configure patient workflow stages, thresholds, and ordering rules.',
    tips: [
      { id: 'stages-1', title: 'Preserve stage flow', description: 'Review downstream impact before changing stage order or labels.' },
      { id: 'stages-2', title: 'Use thresholds', description: 'Set practical thresholds for delay and escalation monitoring.' },
    ],
    tour: [
      { id: 'stages-tour-1', title: 'Stages Header', description: 'Start here to understand the stage workflow section.', selector: '[data-help-id="admin-stages-header"]' },
      { id: 'stages-tour-2', title: 'Stages List', description: 'Create, edit, and reorder workflow stages in this area.', selector: '[data-help-id="admin-stages-list"]' },
    ],
  },
  {
    routeKey: '/admin/wards',
    pageTitle: 'Ward Management Help',
    summary: 'Configure active wards and keep capacity metadata accurate.',
    tips: [
      { id: 'wards-1', title: 'Keep names consistent', description: 'Use clear, consistent naming to avoid assignment confusion.' },
      { id: 'wards-2', title: 'Review active status', description: 'Deactivate only when ward operations are fully retired.' },
    ],
    tour: [
      { id: 'wards-tour-1', title: 'Wards Header', description: 'Main controls and add-ward action are shown here.', selector: '[data-help-id="admin-wards-header"]' },
      { id: 'wards-tour-2', title: 'Wards Table', description: 'Manage existing ward records and status here.', selector: '[data-help-id="admin-wards-table"]' },
    ],
  },
  {
    routeKey: '/admin/shifts',
    pageTitle: 'Shift Schedules Help',
    summary: 'Manage operational shifts used for analytics and audit attribution.',
    tips: [
      { id: 'shifts-1', title: 'Validate overlap windows', description: 'Transition overlaps should reflect real handover timings.' },
      { id: 'shifts-2', title: 'Avoid unnecessary edits', description: 'Frequent schedule changes may impact report consistency.' },
    ],
    tour: [
      { id: 'shifts-tour-1', title: 'Shifts Header', description: 'Shift overview and setup intent are described here.', selector: '[data-help-id="admin-shifts-header"]' },
      { id: 'shifts-tour-2', title: 'Shift List', description: 'Manage shift definitions in this section.', selector: '[data-help-id="admin-shifts-list"]' },
    ],
  },
  {
    routeKey: '/admin/delay-reasons',
    pageTitle: 'Delay Reasons Help',
    summary: 'Configure standardized disposition delay reasons for consistent attribution.',
    tips: [
      { id: 'dr-1', title: 'Use concise options', description: 'Keep options clear so nurses can choose quickly and accurately.' },
      { id: 'dr-2', title: 'Avoid duplicates', description: 'Merge similar labels to preserve report quality.' },
    ],
    tour: [
      { id: 'dr-tour-1', title: 'Delay Reason Header', description: 'This section explains how options affect nurse workflows.', selector: '[data-help-id="admin-delay-reasons-header"]' },
      { id: 'dr-tour-2', title: 'Delay Reason List', description: 'Create, update, and order dropdown options here.', selector: '[data-help-id="admin-delay-reasons-list"]' },
    ],
  },
  {
    routeKey: '/dashboard',
    pageTitle: 'Nurse Dashboard Help',
    summary: 'Manage stage updates, monitor delays, and handle temporary/virtual bed actions.',
    tips: [
      { id: 'dash-1', title: 'Update patient stage', description: 'Select a bed card and choose the next stage button.' },
      { id: 'dash-2', title: 'Watch delay indicators', description: 'Delayed beds are highlighted and need immediate attention.' },
      { id: 'dash-3', title: 'Recover from mistakes', description: 'Use Undo when available or ask supervisor for override.' },
    ],
    tour: [
      { id: 'dash-tour-1', title: 'Page Header', description: 'Start here for user context and session actions.', selector: '[data-help-id="dashboard-header"]' },
      { id: 'dash-tour-2', title: 'Action Toolbar', description: 'Use settings, virtual beds, and connection controls.', selector: '[data-help-id="dashboard-actions"]' },
      { id: 'dash-tour-3', title: 'Bed Grid', description: 'Core area for stage progression and patient flow tracking.', selector: '[data-help-id="dashboard-grid"]' },
    ],
  },
  {
    routeKey: '/supervisor',
    pageTitle: 'Supervisor Help',
    summary: 'Review ward status, escalations, and supervise operational corrections.',
    tips: [
      { id: 'sup-1', title: 'Open analytics', description: 'Use the Analytics button for bottleneck and trend details.' },
      { id: 'sup-2', title: 'Manage surge capacity', description: 'Add/remove temporary and virtual beds as load changes.' },
    ],
    tour: [
      { id: 'sup-tour-1', title: 'Supervisor Header', description: 'Role controls and analytics access are grouped here.', selector: '[data-help-id="supervisor-header"]' },
      { id: 'sup-tour-2', title: 'Bed Overview', description: 'Monitor bed state changes and intervene quickly.', selector: '[data-help-id="supervisor-overview"]' },
    ],
  },
  {
    routeKey: '/admin',
    pageTitle: 'Admin Help',
    summary: 'Configure users, settings, workflows, and operational governance.',
    tips: [
      { id: 'admin-1', title: 'Use quick actions', description: 'Navigate to beds, stages, shifts, wards, and delay reasons.' },
      { id: 'admin-2', title: 'Review audit-sensitive changes', description: 'Critical configuration changes should be reviewed and traceable.' },
    ],
    tour: [
      { id: 'admin-tour-1', title: 'Admin Header', description: 'System-level controls and session actions.', selector: '[data-help-id="admin-header"]' },
      { id: 'admin-tour-2', title: 'Quick Actions', description: 'Jump directly to common management areas.', selector: '[data-help-id="admin-quick-actions"]' },
    ],
  },
  {
    routeKey: '/analytics',
    pageTitle: 'Analytics Help',
    summary: 'Inspect trends, bottlenecks, and performance metrics for operational decisions.',
    tips: [
      { id: 'ana-1', title: 'Start with KPIs', description: 'Use high-level cards first, then drill down to detailed charts.' },
      { id: 'ana-2', title: 'Export when needed', description: 'Use exports for reporting, review, and handover discussions.' },
    ],
    tour: [
      { id: 'ana-tour-1', title: 'Analytics Header', description: 'Navigation, print, and export actions are grouped here.', selector: '[data-help-id="analytics-header"]' },
      { id: 'ana-tour-2', title: 'Stage Analytics', description: 'Review stage-wise flow and delay patterns first.', selector: '[data-help-id="analytics-stage-analytics"]' },
      { id: 'ana-tour-3', title: 'History and Audit', description: 'Use this section for timeline traceability and corrections.', selector: '[data-help-id="analytics-history"]' },
    ],
  },
  {
    routeKey: '/change-password',
    pageTitle: 'Password Reset Help',
    summary: 'Set a strong new password to continue secure access to EWTCS.',
    tips: [
      { id: 'cp-1', title: 'Use a strong password', description: 'Combine uppercase, lowercase, numbers, and symbols.' },
      { id: 'cp-2', title: 'Save safely', description: 'Store credentials securely and avoid shared plaintext notes.' },
    ],
    tour: [
      { id: 'cp-tour-1', title: 'Password Form', description: 'Complete all required fields and submit to continue.', selector: '[data-help-id="change-password-form"]' },
    ],
  },
  {
    routeKey: '/manual',
    pageTitle: 'User Manual Help',
    summary: 'Use this screen for full documentation and printable onboarding content.',
    tips: [
      { id: 'manual-1', title: 'Search by feature', description: 'Use keywords like Dashboard, Shift, or AI Summary.' },
      { id: 'manual-2', title: 'Print for training', description: 'Use Print PDF for ward-level orientation materials.' },
    ],
    tour: [
      { id: 'manual-tour-1', title: 'Manual Header', description: 'Search topics and access the Print PDF export from here.', selector: '[data-help-id="manual-header"]' },
      { id: 'manual-tour-2', title: 'Feature Sections', description: 'Browse annotated walkthroughs and usage examples for each feature.', selector: '[data-help-id="manual-content"]' },
    ],
  },
  {
    routeKey: '/login',
    pageTitle: 'Login Help',
    summary: 'Use assigned credentials and enable kiosk mode only on dedicated workstations.',
    tips: [
      { id: 'login-1', title: 'Standard sign-in', description: 'Enter username and password to continue to your role dashboard.' },
      { id: 'login-2', title: 'Kiosk mode caution', description: 'Enable kiosk mode only on approved static nurse terminals.' },
    ],
    tour: [
      { id: 'login-tour-1', title: 'Login Form', description: 'Complete username and password fields and click Sign In to proceed.', selector: '[data-help-id="login-form"]' },
      { id: 'login-tour-2', title: 'Kiosk Mode Option', description: 'Enable kiosk mode only on approved dedicated workstations.', selector: '[data-help-id="login-kiosk"]' },
    ],
  },
  {
    routeKey: '/',
    pageTitle: 'EWTCS Home',
    summary: 'Welcome to EWTCS — sign in to access your role-based dashboard.',
    tips: [
      { id: 'home-1', title: 'Sign in', description: 'Click "Nurse Portal" in the top-right to go to the login screen.' },
      { id: 'home-2', title: 'Role-based access', description: 'Each role (Nurse, Supervisor, Admin) has a dedicated workflow dashboard.' },
    ],
    tour: [],
  },
]

export function getHelpContextByPath(pathname: string): HelpContext {
  const match = HELP_CONTEXTS.find((context) => {
    if (context.routeKey === '/') return pathname === '/'
    return pathname.startsWith(context.routeKey)
  })
  return match ?? DEFAULT_HELP_CONTEXT
}

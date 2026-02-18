# User Stories - Emergency Ward Bed Status & AI Reporting System

**Version**: 2.1  
**Last Updated**: 2026-02-14  
**Status**: ✅ Production-Ready for JMCH Deployment

---

## Table of Contents

- [EPIC 0: System Foundation & Setup](#epic-0-system-foundation--setup)
- [EPIC 1: Nurse Desk Bed Dashboard](#epic-1-nurse-desk-bed-dashboard)
- [EPIC 2: One-Click Stage Update System](#epic-2-one-click-stage-update-system)
- [EPIC 3: Time Tracking & Stage Logging](#epic-3-time-tracking--stage-logging)
- [EPIC 4: Color Coding & Visual Alerts](#epic-4-color-coding--visual-alerts)
- [EPIC 5: Authentication & Role-Based Access](#epic-5-authentication--role-based-access)
- [EPIC 6: Bed & Workflow Configuration](#epic-6-bed--workflow-configuration)
- [EPIC 7: Error Handling & Correction](#epic-7-error-handling--correction)
- [EPIC 8: Shift Management](#epic-8-shift-management)
- [EPIC 9: Daily AI Summary Generator](#epic-9-daily-ai-summary-generator)
- [EPIC 10: Management Report Dashboard](#epic-10-management-report-dashboard)
- [EPIC 11: Export & External Sharing](#epic-11-export--external-sharing)
- [EPIC 12: Audit Logs & Compliance](#epic-12-audit-logs--compliance)
- [EPIC 13: System Performance & Reliability](#epic-13-system-performance--reliability)
- [EPIC 14: Data Retention & Archival](#epic-14-data-retention--archival)
- [EPIC 15: Notifications & Alerts](#epic-15-notifications--alerts)
- [EPIC 16: Offline & Network Failure Mode](#epic-16-offline--network-failure-mode)
- [EPIC 17: Security & Privacy](#epic-17-security--privacy)
- [EPIC 18: Deployment, Training & Documentation](#epic-18-deployment-training--documentation)
- [EPIC 19: External Integration & APIs](#epic-19-external-integration--apis)

---

## EPIC 0: System Foundation & Setup

### US-0.1: CLI-Based Initial Configuration

**As a** system administrator  
**I want** a simple CLI command to initialize the system  
**So that** I can deploy quickly without complex UI wizards

**Acceptance Criteria:**
- [ ] Single CLI command initializes database schema
- [ ] Command creates initial admin user (credentials via env vars)
- [ ] Command validates database connection before proceeding
- [ ] Command outputs clear success/failure messages
- [ ] Command is idempotent (safe to run multiple times)

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-0.2

---

### US-0.2: Database Schema Management

**As a** system administrator  
**I want** automated database migrations  
**So that** schema updates don't require manual SQL

**Acceptance Criteria:**
- [ ] Migration scripts are version-controlled
- [ ] Migrations run automatically on deployment
- [ ] Rollback capability exists for failed migrations
- [ ] Migration status is logged
- [ ] Schema changes are backward compatible

**Priority:** P0 (Critical)  
**Story Points:** 8  
**Dependencies:** None

---

### US-0.3: Environment Configuration Management

**As a** system administrator  
**I want** to manage environment-specific configurations  
**So that** I can deploy to different environments (dev, staging, production)

**Acceptance Criteria:**
- [ ] Configuration uses environment variables
- [ ] Sensitive data (passwords, API keys) are encrypted
- [ ] Configuration validation on startup
- [ ] Example configuration file is provided
- [ ] Configuration documentation is clear

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** None

---

### US-0.4: Initial Seed Data for Hospital Layout

**As a** system administrator  
**I want** to pre-load JMCH's specific bed numbers and stages  
**So that** nurses don't have to manually add 20-50 beds on Day 1

**Acceptance Criteria:**
- [ ] Seed script loads hospital-specific bed numbers (e.g., ER-01 to ER-50)
- [ ] Seed script loads default stages (Triage, Registration, etc.)
- [ ] Seed script is configurable via JSON/YAML file
- [ ] Seed script can be run during initial setup or later
- [ ] Seed script validates data before insertion

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-0.2

---

### US-0.5: Database Health Check & System Offline Banner

**As a** nurse  
**I want** to see a clear "System Offline" banner if the database fails  
**So that** I know to revert to paper records immediately

**Acceptance Criteria:**
- [ ] System checks database connection every 10 seconds
- [ ] Massive red "SYSTEM OFFLINE" banner appears on connection loss
- [ ] Banner includes timestamp of last successful connection
- [ ] Banner instructs staff to use paper records
- [ ] System auto-recovers when database is back online

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-1.1

---

## EPIC 1: Nurse Desk Bed Dashboard

### US-1.1: View All Emergency Beds in Grid Layout

**As a** nurse at the emergency ward desk  
**I want** to see all emergency beds displayed in a grid layout on a single screen  
**So that** I can quickly understand the current status of all beds without switching between multiple systems

**Acceptance Criteria:**
- [ ] All beds are visible on one screen without scrolling (for standard bed count)
- [ ] Each bed displays its bed number clearly
- [ ] Grid layout is responsive and adapts to screen size
- [ ] Bed cards show current stage name
- [ ] No manual refresh required to see updates

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** None

---

### US-1.2: Display Real-Time Bed Status

**As a** nurse  
**I want** to see the current stage of each bed update in real-time  
**So that** I always have accurate information without manually refreshing

**Acceptance Criteria:**
- [ ] Status updates appear within 1 second of change
- [ ] Auto-refresh mechanism works without page reload
- [ ] WebSocket or polling mechanism is implemented
- [ ] No flickering or jarring UI updates
- [ ] Connection status indicator is visible

**Priority:** P0 (Critical)  
**Story Points:** 8  
**Dependencies:** US-1.1

---

### US-1.3: Show Elapsed Time Per Bed

**As a** nurse supervisor  
**I want** to see how long each patient has been in the emergency ward  
**So that** I can identify patients who have been waiting too long

**Acceptance Criteria:**
- [ ] Elapsed time displays in hours and minutes (e.g., "2h 45m")
- [ ] Timer updates every minute
- [ ] Time is calculated from patient admission to current time
- [ ] Time display is prominent and easy to read
- [ ] Time format is consistent across all beds

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-3.1, US-3.2

---

### US-1.4: Color Code Beds by Stage

**As a** nurse  
**I want** beds to be color-coded based on their current stage  
**So that** I can instantly identify what's happening with each patient

**Acceptance Criteria:**
- [ ] Each stage has a distinct color
- [ ] Colors are clearly distinguishable
- [ ] Color legend is visible on the dashboard
- [ ] Colors meet accessibility standards (WCAG 2.1)
- [ ] Color scheme is consistent throughout the application

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-1.1, US-4.1

---

### US-1.5: Filter and Sort Delayed Beds

**As a** nurse supervisor  
**I want** to filter and sort beds to show delayed patients first  
**So that** I can prioritize attention to patients who have exceeded time thresholds

**Acceptance Criteria:**
- [ ] "Show Delayed Only" filter button is available
- [ ] Delayed beds can be sorted by delay duration
- [ ] Filter state persists during session
- [ ] Clear indication when filter is active
- [ ] One-click to clear filter

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-1.3, US-3.3

---

### US-1.6: Track Disposition Bottlenecks

**As a** hospital administrator  
**I want** to identify patients stuck in "Decision Made" stage waiting for beds upstairs  
**So that** I can understand capacity bottlenecks beyond the emergency ward

**Acceptance Criteria:**
- [ ] Patients in Stage 5 (Decision Made) for >30 minutes are flagged
- [ ] Visual indicator shows disposition bottleneck
- [ ] Count of patients waiting for upstairs beds is displayed
- [ ] Reason for delay can be recorded (dropdown)
- [ ] Data is available for reporting

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-1.1, US-2.1

---

### US-1.7: Display Reason for Delay

**As a** nurse supervisor  
**I want** to see why a patient is delayed when they stay in Stage 5 for more than 30 minutes  
**So that** I can take appropriate action or escalate to management

**Acceptance Criteria:**
- [ ] "Reason for Delay" toggle appears after 30 minutes in Stage 5
- [ ] Dropdown menu with predefined reasons (no free text)
- [ ] Reasons include: "No ICU bed", "No General Ward bed", "Awaiting specialist", etc.
- [ ] Reason is saved and visible on bed card
- [ ] Reason is included in reports

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-1.6

---

### US-1.8: Mobile-Responsive Dashboard

**As a** supervisor on the move  
**I want** to view the dashboard on my mobile device  
**So that** I can monitor the ward from anywhere

**Acceptance Criteria:**
- [ ] Dashboard is fully responsive on tablets and phones
- [ ] Touch gestures work for interactions
- [ ] Mobile layout prioritizes critical information
- [ ] Mobile performance is acceptable (<3s load)
- [ ] Mobile view is tested on iOS and Android

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-1.1

---

### US-1.9: Search Beds by Number or Status

**As a** nurse  
**I want** to search for specific beds  
**So that** I can quickly find a bed in a large ward

**Acceptance Criteria:**
- [ ] Search box is prominently placed
- [ ] Search by bed number works
- [ ] Search by patient status works
- [ ] Search results are highlighted
- [ ] Search is fast (<500ms)

**Priority:** P2 (Medium)  
**Story Points:** 3  
**Dependencies:** US-1.1

---

## EPIC 2: One-Click Stage Update System

### US-2.1: Update Patient Stage with Single Click

**As a** nurse  
**I want** to update a patient's stage with a single button click  
**So that** I can quickly update status without typing or navigating complex forms

**Acceptance Criteria:**
- [x] Stage buttons are clearly labeled and visible
- [x] Click updates stage immediately
- [x] Visual feedback confirms the update
- [x] No keyboard input required
- [ ] Update completes in ≤2 seconds

**Implementation Notes:**
- Inline stage buttons added to each bed card with immediate update handling.
- Success feedback shown inline; per-bed errors display if update fails.
- Performance verification for the ≤2s requirement is pending in staging.

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-1.1

---

### US-2.2: Validate Stage Transitions

**As a** system administrator  
**I want** the system to prevent invalid stage transitions  
**So that** data integrity is maintained and illogical workflows are prevented

**Acceptance Criteria:**
- [ ] Only valid next stages are enabled as buttons
- [ ] Invalid transitions are grayed out or hidden
- [ ] Validation rules are configurable
- [ ] Error message explains why transition is invalid
- [ ] Supervisor override option exists for edge cases

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-2.1

---

### US-2.3: Reset Bed on Patient Discharge

**As a** nurse  
**I want** the bed to automatically reset when I mark a patient as discharged  
**So that** the bed is ready to track the next patient

**Acceptance Criteria:**
- [ ] Discharge button triggers bed reset workflow
- [ ] Confirmation prompt appears before reset
- [ ] All patient data is archived before reset
- [ ] Bed status changes to "Cleaning" or "Available"
- [ ] Reset is logged in audit trail

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-2.1, US-3.2

---

### US-2.4: Track Bed Cleaning and Turnaround Time

**As a** operations manager  
**I want** to track the time between patient discharge and bed readiness  
**So that** I can optimize bed turnaround processes

**Acceptance Criteria:**
- [ ] "Cleaning" sub-status is available after discharge
- [ ] "Ready for Next Patient" button appears after cleaning starts
- [ ] Turnaround time (TAT) is calculated and stored
- [ ] TAT is visible in reports
- [ ] Average TAT is displayed on dashboard

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-2.3

---

### US-2.5: Enable Housekeeping Mode

**As a** housekeeping staff member  
**I want** to mark when I start and finish cleaning a bed  
**So that** nurses know when the bed is truly ready for the next patient

**Acceptance Criteria:**
- [ ] "Start Cleaning" button available after discharge
- [ ] "Cleaning Complete" button available during cleaning
- [ ] Housekeeping staff can log in with limited permissions
- [ ] Cleaning duration is tracked
- [ ] Bed status is clearly marked as "In Cleaning"

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-2.4, US-5.1

---

### US-2.6: Provide Optional Confirmation Prompts

**As a** nurse  
**I want** confirmation prompts for critical stage changes  
**So that** I don't accidentally update the wrong bed

**Acceptance Criteria:**
- [ ] Confirmation appears for discharge and critical stages
- [ ] Confirmation can be disabled in settings (for experienced users)
- [ ] Confirmation shows bed number and current stage
- [ ] "Yes/No" buttons are clearly distinguishable
- [ ] Keyboard shortcuts work (Enter/Escape)

**Priority:** P2 (Medium)  
**Story Points:** 3  
**Dependencies:** US-2.1

---

## EPIC 3: Time Tracking & Stage Logging

### US-3.1: Capture Patient Entry Time

**As a** system  
**I want** to automatically record the exact time a patient is admitted to a bed  
**So that** accurate duration calculations can be performed

**Acceptance Criteria:**
- [ ] Timestamp is captured when bed status changes from "Empty" to "Occupied"
- [ ] Timestamp uses server time (not client time)
- [ ] Timestamp is stored in ISO 8601 format
- [ ] Timestamp is immutable once set
- [ ] Timezone is recorded with timestamp

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-2.1

---

### US-3.2: Log Stage Transition Timestamps

**As a** data analyst  
**I want** every stage transition to be timestamped  
**So that** I can analyze time spent in each stage

**Acceptance Criteria:**
- [ ] Every stage change creates a log entry
- [ ] Log includes: timestamp, old stage, new stage, user ID
- [ ] Logs are stored in database
- [ ] Logs are immutable (cannot be deleted, only corrected)
- [ ] Logs are queryable for reporting

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-2.1, US-3.1

---

### US-3.3: Calculate Total Duration and Detect Delays

**As a** nurse supervisor  
**I want** the system to automatically calculate total time and flag delays  
**So that** I don't have to manually track which patients are delayed

**Acceptance Criteria:**
- [ ] Total duration is calculated from admission to current time
- [ ] Delay is flagged when duration exceeds 3 hours (configurable)
- [ ] Delay threshold is configurable per hospital
- [ ] Delayed beds are visually highlighted
- [ ] Delay count is shown on dashboard

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-3.1, US-3.2

---

### US-3.4: Track Bed Turnaround Time (TAT)

**As a** operations manager  
**I want** to track time from discharge to next patient admission  
**So that** I can identify inefficiencies in bed preparation

**Acceptance Criteria:**
- [ ] TAT starts when patient is discharged
- [ ] TAT ends when next patient is admitted
- [ ] TAT includes cleaning time
- [ ] TAT is stored per bed per patient cycle
- [ ] Average TAT is calculated and displayed

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-2.3, US-2.4

---

### US-3.5: Attribute Delays to Root Causes

**As a** hospital administrator  
**I want** delays to be categorized by root cause (emergency staff vs. hospital capacity)  
**So that** I can make informed decisions about resource allocation

**Acceptance Criteria:**
- [ ] Delays in Stages 1-4 are attributed to "Emergency Staff"
- [ ] Delays in Stage 5 are attributed to "Hospital Capacity" if reason is bed unavailability
- [ ] Attribution logic is configurable
- [ ] Reports show delays by attribution category
- [ ] Pie chart or breakdown is available

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-1.7, US-3.3

---

### US-3.6: Maintain Historical Stage Logs

**As a** compliance officer  
**I want** all historical stage transitions to be permanently stored  
**So that** audits and investigations can be conducted

**Acceptance Criteria:**
- [ ] Logs are never deleted
- [ ] Logs are stored in separate archive table after 90 days
- [ ] Logs are retrievable by date range and bed number
- [ ] Logs include all metadata (user, timestamp, stage)
- [ ] Logs are exportable for external review

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-3.2, US-14.1

---

## EPIC 4: Color Coding & Visual Alerts

### US-4.1: Define Stage-Based Color Mapping

**As a** system administrator  
**I want** to configure colors for each stage  
**So that** the dashboard is visually intuitive

**Acceptance Criteria:**
- [ ] Each stage has a configurable color
- [ ] Color picker is available in admin settings
- [ ] Default color scheme is provided
- [ ] Colors are saved in database
- [ ] Color changes apply immediately to dashboard

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-6.2

---

### US-4.2: Highlight Delayed Beds in Red

**As a** nurse  
**I want** beds that exceed the time threshold to turn red  
**So that** I can immediately see which patients need attention

**Acceptance Criteria:**
- [ ] Bed card background turns red when threshold is exceeded
- [ ] Red color overrides stage color
- [ ] Threshold is configurable (default 3 hours)
- [ ] Red color is accessible (sufficient contrast)
- [ ] Legend explains red color meaning

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-3.3, US-4.1

---

### US-4.3: Add Blinking Animation for Critical Delays

**As a** nurse supervisor  
**I want** critically delayed beds to blink or pulse  
**So that** they grab attention even in a busy ward

**Acceptance Criteria:**
- [ ] Beds delayed >4 hours (configurable) have pulsing animation
- [ ] Animation is subtle and not distracting
- [ ] Animation can be disabled in accessibility settings
- [ ] Animation stops when bed is clicked/acknowledged
- [ ] Animation resumes if bed remains delayed

**Priority:** P2 (Medium)  
**Story Points:** 3  
**Dependencies:** US-4.2

---

### US-4.4: Display Color Legend

**As a** new nurse  
**I want** to see a legend explaining what each color means  
**So that** I can understand the dashboard without training

**Acceptance Criteria:**
- [ ] Legend is always visible on dashboard
- [ ] Legend shows all stage colors
- [ ] Legend shows red = delayed
- [ ] Legend is collapsible to save space
- [ ] Legend is accessible (screen reader compatible)

**Priority:** P1 (High)  
**Story Points:** 2  
**Dependencies:** US-4.1

---

### US-4.5: Ensure Accessibility Compliance

**As a** user with color blindness  
**I want** the dashboard to use patterns or icons in addition to colors  
**So that** I can distinguish bed statuses without relying solely on color

**Acceptance Criteria:**
- [ ] Each stage has an icon in addition to color
- [ ] Icons are clearly visible
- [ ] Color combinations meet WCAG 2.1 AA standards
- [ ] High contrast mode is available
- [ ] Accessibility audit passes

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-4.1

---

### US-4.6: Dark Mode Support

**As a** night shift nurse  
**I want** a dark mode option  
**So that** the bright screen doesn't strain my eyes

**Acceptance Criteria:**
- [ ] Dark mode toggle is available
- [ ] Dark mode uses appropriate colors
- [ ] Dark mode maintains accessibility standards
- [ ] Dark mode preference is saved
- [ ] Dark mode works with all features

**Priority:** P3 (Low)  
**Story Points:** 5  
**Dependencies:** US-4.1

---

### US-4.7: Accessibility Audit & Compliance

**As a** accessibility officer  
**I want** the system to meet WCAG 2.1 AA standards  
**So that** users with disabilities can use the system

**Acceptance Criteria:**
- [ ] Automated accessibility tests pass (axe, WAVE)
- [ ] Manual accessibility audit is conducted
- [ ] Screen reader compatibility is verified
- [ ] Keyboard navigation works for all features
- [ ] Accessibility issues are tracked and fixed

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-4.5

---

## EPIC 5: Authentication & Role-Based Access

### US-5.1: Implement User Login System

**As a** hospital staff member  
**I want** to log in with my credentials  
**So that** my actions are tracked and the system is secure

**Acceptance Criteria:**
- [ ] Login page with username and password fields
- [ ] Credentials are validated against database
- [ ] Failed login attempts are logged
- [ ] Account lockout after 5 failed attempts
- [ ] Session is created upon successful login

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** None

---

### US-5.2: Define User Roles and Permissions

**As a** system administrator  
**I want** to assign roles to users (Nurse, Supervisor, Admin)  
**So that** each user has appropriate access levels

**Acceptance Criteria:**
- [ ] Three roles are defined: Nurse, Supervisor, Admin
- [ ] Nurses can update bed status
- [ ] Supervisors can view reports and correct errors
- [ ] Admins can configure system and manage users
- [ ] Permissions are enforced on backend

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-5.1

---

### US-5.3: Enable Kiosk Mode for Nurse Desk

**As a** nurse desk workstation  
**I want** to stay logged in permanently without timeouts  
**So that** nurses don't have to re-login constantly

**Acceptance Criteria:**
- [ ] "Kiosk Mode" option available during login
- [ ] Kiosk sessions don't expire
- [ ] Kiosk mode is tied to specific IP or device
- [ ] Kiosk mode can be disabled by admin
- [ ] Kiosk mode is clearly indicated on screen

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-5.1

---

### US-5.4: Implement Persistent Sessions

**As a** nurse  
**I want** my session to persist even if the browser is closed  
**So that** I don't lose my work during shift changes

**Acceptance Criteria:**
- [ ] Session token is stored in secure cookie
- [ ] Session remains valid for 12 hours (configurable)
- [ ] Session can be manually logged out
- [ ] Session expires after inactivity period (configurable)
- [ ] Session is renewed on activity

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-5.1

---

### US-5.5: Provide Password Reset Functionality

**As a** user who forgot their password  
**I want** to reset my password securely  
**So that** I can regain access to the system

**Acceptance Criteria:**
- [ ] "Forgot Password" link on login page
- [ ] Admin can reset passwords manually
- [ ] Password reset requires email verification (if email is configured)
- [ ] Temporary passwords expire after first use
- [ ] Password reset is logged

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-5.1

---

### US-5.6: Implement Secure Logout

**As a** user  
**I want** to log out securely  
**So that** no one can access the system using my session

**Acceptance Criteria:**
- [ ] Logout button is visible on all pages
- [ ] Logout clears session token
- [ ] Logout redirects to login page
- [ ] Logout is logged in audit trail
- [ ] Logout works even if server is unreachable (client-side cleanup)

**Priority:** P1 (High)  
**Story Points:** 2  
**Dependencies:** US-5.1

---

### US-5.7: Manage Users (Add, Edit, Deactivate)

**As a** system administrator  
**I want** to add, edit, and deactivate users  
**So that** I can control who has access to the system

**Acceptance Criteria:**
- [ ] Admin can create new users with username, password, role
- [ ] Admin can edit user details and roles
- [ ] Admin can deactivate (not delete) users
- [ ] Deactivated users cannot log in
- [ ] User management actions are logged

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-5.1, US-5.2

---

## EPIC 6: Bed & Workflow Configuration

### US-6.1: Add, Edit, and Remove Beds

**As a** system administrator  
**I want** to add, edit, or remove beds from the system  
**So that** the dashboard matches the physical ward layout

**Acceptance Criteria:**
- [ ] Admin panel has "Manage Beds" section
- [ ] Beds can be added with number and location
- [ ] Beds can be edited (rename, relocate)
- [ ] Beds can be deactivated (not deleted)
- [ ] Changes are reflected immediately on dashboard

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-5.2

---

### US-6.2: Configure Stage Names and Workflow

**As a** system administrator  
**I want** to customize stage names to match our hospital's workflow  
**So that** the system aligns with our processes

**Acceptance Criteria:**
- [ ] Admin can add, edit, remove stages
- [ ] Stage order can be rearranged
- [ ] Stage names are limited to 50 characters
- [ ] Default stages are provided
- [ ] Changes apply to all beds

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-5.2

---

### US-6.3: Set Time Thresholds

**As a** system administrator  
**I want** to configure the delay threshold (e.g., 3 hours, 3.5 hours)  
**So that** the system matches our hospital's performance targets

**Acceptance Criteria:**
- [ ] Threshold is configurable in admin settings
- [ ] Threshold can be set in hours and minutes
- [ ] Different thresholds can be set per stage (advanced)
- [ ] Threshold changes apply immediately
- [ ] Default threshold is 3 hours

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-5.2

---

### US-6.5: Create Ad-Hoc Temporary Beds

**As a** nurse supervisor  
**I want** to add temporary beds during surge capacity situations  
**So that** all patients are tracked even during mass casualty incidents

**Acceptance Criteria:**
- [ ] "Add Temporary Bed" button is available
- [ ] Temporary beds are clearly marked
- [ ] Temporary beds function like regular beds
- [ ] Temporary beds can be removed when no longer needed
- [ ] Temporary beds are included in reports

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-6.1

---

### US-6.6: Support Virtual Beds for Hallway Patients

**As a** nurse  
**I want** to track patients on stretchers in hallways as virtual beds  
**So that** no patient is invisible to the system

**Acceptance Criteria:**
- [ ] Virtual beds can be created on-the-fly
- [ ] Virtual beds are labeled (e.g., "Hallway 1", "Stretcher A")
- [ ] Virtual beds have same functionality as physical beds
- [ ] Virtual beds are visually distinguished
- [ ] Virtual beds are included in capacity calculations

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-6.5

---

## EPIC 7: Error Handling & Correction

### US-7.1: Undo Last Action

**As a** nurse  
**I want** to undo my last action if I clicked the wrong button  
**So that** I can quickly correct mistakes

**Acceptance Criteria:**
- [ ] "Undo" button appears after stage update
- [ ] Undo reverts to previous stage
- [ ] Undo is available for 30 seconds
- [ ] Undo is logged in audit trail
- [ ] Only the last action can be undone

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-2.1, US-3.2

---

### US-7.2: Edit Stage History with Supervisor Approval

**As a** supervisor  
**I want** to correct stage history when errors are discovered  
**So that** reports are accurate

**Acceptance Criteria:**
- [ ] Supervisors can access "Edit History" function
- [ ] Edit requires reason and approval
- [ ] Original data is preserved in audit trail
- [ ] Correction is clearly marked
- [ ] Correction is logged with supervisor ID

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-5.2, US-3.2

---

### US-7.3: Maintain Correction Audit Trail

**As a** compliance officer  
**I want** all corrections to be logged permanently  
**So that** I can review what was changed and why

**Acceptance Criteria:**
- [ ] Corrections are logged separately from regular logs
- [ ] Correction log includes: original value, new value, reason, approver
- [ ] Correction logs are immutable
- [ ] Correction logs are exportable
- [ ] Correction logs are searchable

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-7.2, US-12.1

---

### US-7.4: Require Reason for Manual Corrections

**As a** system administrator  
**I want** users to provide a reason when correcting data  
**So that** corrections are justified and traceable

**Acceptance Criteria:**
- [ ] Reason field is mandatory for corrections
- [ ] Dropdown with common reasons is provided
- [ ] Free text option is available for other reasons
- [ ] Reason is stored with correction
- [ ] Reason is visible in audit reports

**Priority:** P2 (Medium)  
**Story Points:** 3  
**Dependencies:** US-7.2

---

## EPIC 8: Shift Management

### US-8.1: Define Shift Schedules

**As a** system administrator  
**I want** to define shift schedules (Morning, Evening, Night)  
**So that** data can be analyzed by shift

**Acceptance Criteria:**
- [ ] Admin can create shifts with start and end times
- [ ] Default shifts are: Morning (6am-2pm), Evening (2pm-10pm), Night (10pm-6am)
- [ ] Shifts can be customized
- [ ] Shifts can overlap (for transition periods)
- [ ] Shifts are stored in database

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-5.2

---

### US-8.2: Tag Data by Shift

**As a** system  
**I want** to automatically tag each bed status update with the current shift  
**So that** shift-wise analysis is possible

**Acceptance Criteria:**
- [ ] Shift is determined by current time
- [ ] Shift is stored with each log entry
- [ ] Shift is visible in reports
- [ ] Shift can be manually overridden by supervisor
- [ ] Shift tagging works across midnight boundary

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-8.1, US-3.2

---

### US-8.3: Generate Shift-Wise Reports

**As a** hospital administrator  
**I want** to view reports filtered by shift  
**So that** I can compare performance across shifts

**Acceptance Criteria:**
- [ ] Reports can be filtered by shift
- [ ] Shift comparison view is available
- [ ] Metrics include: patients treated, average time, delays
- [ ] Charts show shift-wise trends
- [ ] Reports can be exported per shift

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-8.2, US-10.1

---

### US-8.4: Compare Shift Performance

**As a** operations manager  
**I want** to see a side-by-side comparison of shift performance  
**So that** I can identify which shifts need more resources

**Acceptance Criteria:**
- [ ] Comparison table shows key metrics per shift
- [ ] Metrics include: throughput, delays, average TAT
- [ ] Visual indicators show best/worst performing shifts
- [ ] Comparison can be filtered by date range
- [ ] Comparison is exportable

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-8.3

---

## EPIC 9: Daily AI Summary Generator

### US-9.1: Aggregate Daily Statistics

**As a** system  
**I want** to aggregate all bed data at the end of each day  
**So that** AI can generate a summary

**Acceptance Criteria:**
- [ ] Aggregation runs automatically at midnight
- [ ] Aggregation can be triggered manually
- [ ] Aggregated data includes: total patients, average time, delays, TAT
- [ ] Aggregation is stored in summary table
- [ ] Aggregation is idempotent (can be re-run safely)

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-3.2, US-3.3

---

### US-9.2: Generate AI Text Summary

**As a** hospital administrator  
**I want** an AI-generated summary of the day's performance  
**So that** I can quickly understand what happened without reading raw numbers

**Acceptance Criteria:**
- [ ] AI generates 200-300 word summary
- [ ] Summary includes key insights and trends
- [ ] Summary is written in clear, professional language
- [ ] Summary highlights bottlenecks and successes
- [ ] AI uses aggregated data from US-9.1

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-9.1

---

### US-9.3: Enable Supervisor Review Before Publishing

**As a** supervisor  
**I want** to review and edit the AI summary before it's published  
**So that** I can ensure accuracy and add context

**Acceptance Criteria:**
- [ ] AI summary is saved in "Draft" status
- [ ] Supervisor receives notification to review
- [ ] Supervisor can edit summary text
- [ ] Supervisor can approve or reject summary
- [ ] Summary is only published after approval

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-9.2, US-5.2

---

### US-9.4: Display AI Confidence Score

**As a** supervisor  
**I want** to see a confidence score for AI-generated insights  
**So that** I know which parts of the summary to scrutinize

**Acceptance Criteria:**
- [ ] Confidence score (0-100%) is displayed per insight
- [ ] Low confidence insights are highlighted
- [ ] Confidence calculation is transparent
- [ ] Supervisor can flag low-confidence items for review
- [ ] Confidence score is stored with summary

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-9.2

---

### US-9.5: Implement Human-in-the-Loop Verification

**As a** system  
**I want** to require human verification before AI summaries are finalized  
**So that** AI hallucinations don't lead to wrong decisions

**Acceptance Criteria:**
- [ ] AI summary cannot be published without human approval
- [ ] Supervisor must explicitly approve or reject
- [ ] Rejection requires reason
- [ ] Approval is logged with supervisor ID
- [ ] Unapproved summaries are clearly marked

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-9.3

---

### US-9.6: Save and View Summary History

**As a** hospital administrator  
**I want** to view historical AI summaries  
**So that** I can track performance trends over time

**Acceptance Criteria:**
- [ ] Summaries are stored permanently
- [ ] Summaries can be browsed by date
- [ ] Search functionality is available
- [ ] Summaries are exportable
- [ ] Summaries show approval status and approver

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-9.3

---

## EPIC 10: Management Report Dashboard

### US-10.1: Display Total Patients Treated

**As a** hospital administrator  
**I want** to see the total number of patients treated in a given period  
**So that** I can understand ward utilization

**Acceptance Criteria:**
- [ ] Total patient count is displayed prominently
- [ ] Count can be filtered by date range
- [ ] Count can be filtered by shift
- [ ] Count includes discharged and transferred patients
- [ ] Count is updated in real-time

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-3.2

---

### US-10.2: Calculate Average Time Per Patient

**As a** operations manager  
**I want** to see the average time patients spend in the emergency ward  
**So that** I can benchmark against targets

**Acceptance Criteria:**
- [ ] Average time is calculated from admission to discharge
- [ ] Average is displayed in hours and minutes
- [ ] Average can be filtered by date range and shift
- [ ] Trend line shows how average changes over time
- [ ] Target line can be configured and displayed

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-3.1, US-3.2

---

### US-10.3: Show Percentage of Delayed Patients

**As a** quality manager  
**I want** to see what percentage of patients exceeded the time threshold  
**So that** I can measure quality of care

**Acceptance Criteria:**
- [ ] Percentage is calculated as (delayed patients / total patients) × 100
- [ ] Percentage is displayed as a gauge or progress bar
- [ ] Percentage can be filtered by date range and shift
- [ ] Trend shows improvement or decline
- [ ] Target percentage can be configured

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-3.3, US-10.1

---

### US-10.4: Analyze Bed-Wise Performance

**As a** operations manager  
**I want** to see performance metrics for each bed  
**So that** I can identify if specific beds have issues

**Acceptance Criteria:**
- [ ] Table shows metrics per bed: patients treated, average time, delays
- [ ] Beds can be sorted by any metric
- [ ] Outlier beds are highlighted
- [ ] Bed comparison chart is available
- [ ] Data can be exported

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-10.1, US-10.2

---

### US-10.5: Identify Stage-Wise Delays

**As a** process improvement manager  
**I want** to see which stages have the longest average duration  
**So that** I can focus improvement efforts

**Acceptance Criteria:**
- [ ] Chart shows average time per stage
- [ ] Stages are sorted by duration
- [ ] Bottleneck stages are highlighted
- [ ] Trend shows if bottlenecks are improving
- [ ] Data can be drilled down by date range

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-3.2

---

### US-10.6: Display Heatmaps for Busy Periods

**As a** staffing manager  
**I want** to see a heatmap of busy hours and days  
**So that** I can optimize staff scheduling

**Acceptance Criteria:**
- [ ] Heatmap shows patient volume by hour and day of week
- [ ] Color intensity indicates volume
- [ ] Heatmap is interactive (click to drill down)
- [ ] Heatmap can be filtered by date range
- [ ] Heatmap is exportable as image

**Priority:** P2 (Medium)  
**Story Points:** 8  
**Dependencies:** US-10.1

---

### US-10.7: Provide Interactive Charts

**As a** hospital administrator  
**I want** interactive charts that I can filter and explore  
**So that** I can answer ad-hoc questions

**Acceptance Criteria:**
- [ ] Charts are built with interactive library (e.g., Chart.js, D3)
- [ ] Charts support zoom, pan, filter
- [ ] Charts have tooltips with detailed data
- [ ] Charts can be exported as images
- [ ] Charts are responsive and mobile-friendly

**Priority:** P2 (Medium)  
**Story Points:** 8  
**Dependencies:** US-10.1, US-10.2, US-10.3

---

## EPIC 11: Export & External Sharing

### US-11.1: Export Reports as PDF

**As a** hospital administrator  
**I want** to export reports as PDF  
**So that** I can share them in official meetings

**Acceptance Criteria:**
- [ ] "Export PDF" button is available on report pages
- [ ] PDF includes all visible charts and tables
- [ ] PDF is formatted professionally
- [ ] PDF includes hospital logo and metadata
- [ ] PDF generation completes in <10 seconds

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-10.1

---

### US-11.2: Export Data as CSV

**As a** data analyst  
**I want** to export raw data as CSV  
**So that** I can perform custom analysis in Excel or other tools

**Acceptance Criteria:**
- [ ] "Export CSV" button is available on report pages
- [ ] CSV includes all data rows (not just visible ones)
- [ ] CSV headers are clearly labeled
- [ ] CSV is properly formatted (no encoding issues)
- [ ] CSV download starts immediately

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-10.1

---

### US-11.3: Select Date Range for Export

**As a** user  
**I want** to select a custom date range before exporting  
**So that** I only export the data I need

**Acceptance Criteria:**
- [ ] Date range picker is available on export dialog
- [ ] Default range is "Last 30 days"
- [ ] Custom range can be selected
- [ ] Export includes only data within selected range
- [ ] Date range is shown in exported file name

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-11.1, US-11.2

---

### US-11.4: Provide Print-Friendly View

**As a** user  
**I want** a print-friendly version of reports  
**So that** I can print them directly from the browser

**Acceptance Criteria:**
- [ ] "Print View" button is available
- [ ] Print view removes navigation and unnecessary elements
- [ ] Print view is optimized for A4 paper
- [ ] Print view includes page breaks at logical points
- [ ] Print view works in all major browsers

**Priority:** P2 (Medium)  
**Story Points:** 3  
**Dependencies:** US-10.1

---

### US-11.5: Import Historical Data

**As a** system administrator  
**I want** to import historical data from existing systems  
**So that** we have continuity when switching to this system

**Acceptance Criteria:**
- [ ] CSV import functionality is available
- [ ] Import validates data format
- [ ] Import handles errors gracefully
- [ ] Import progress is shown
- [ ] Import results are logged (success/failure counts)

**Priority:** P2 (Medium)  
**Story Points:** 8  
**Dependencies:** US-11.2

---

## EPIC 12: Audit Logs & Compliance

### US-12.1: Log All User Actions

**As a** compliance officer  
**I want** every user action to be logged  
**So that** I can trace who did what and when

**Acceptance Criteria:**
- [ ] All stage updates are logged
- [ ] All configuration changes are logged
- [ ] All logins/logouts are logged
- [ ] Logs include: user ID, action, timestamp, IP address
- [ ] Logs are immutable

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** US-5.1, US-2.1

---

### US-12.2: Maintain Stage Change History

**As a** auditor  
**I want** to see the complete history of stage changes for each bed  
**So that** I can verify data integrity

**Acceptance Criteria:**
- [ ] History view shows all stage transitions
- [ ] History includes timestamps and user IDs
- [ ] History is sortable and filterable
- [ ] History is exportable
- [ ] History is read-only

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-3.2, US-12.1

---

### US-12.3: Provide Read-Only Audit Mode

**As a** auditor  
**I want** a read-only mode where I can view all data without making changes  
**So that** I can conduct audits safely

**Acceptance Criteria:**
- [ ] Audit role has read-only permissions
- [ ] All action buttons are disabled in audit mode
- [ ] Audit mode is clearly indicated on screen
- [ ] Audit mode allows full data access
- [ ] Audit mode access is logged

**Priority:** P2 (Medium)  
**Story Points:** 3  
**Dependencies:** US-5.2

---

### US-12.4: Enable Supervisor Sign-Off

**As a** supervisor  
**I want** to sign off on daily reports  
**So that** I acknowledge review and accuracy

**Acceptance Criteria:**
- [ ] "Sign Off" button is available on reports
- [ ] Sign-off requires supervisor credentials
- [ ] Sign-off is timestamped and logged
- [ ] Signed-off reports are marked as "Approved"
- [ ] Sign-off cannot be undone (only superseded)

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-5.2, US-10.1

---

## EPIC 13: System Performance & Reliability

### US-13.1: Ensure Fast Page Load Times

**As a** user  
**I want** pages to load in under 2 seconds  
**So that** I can work efficiently

**Acceptance Criteria:**
- [ ] Dashboard loads in <2 seconds on standard hospital network
- [ ] Reports load in <3 seconds
- [ ] Performance is tested on realistic data volumes
- [ ] Performance metrics are monitored
- [ ] Performance regressions trigger alerts

**Priority:** P0 (Critical)  
**Story Points:** 8  
**Dependencies:** None

---

### US-13.2: Implement Auto-Save

**As a** user  
**I want** my changes to be saved automatically  
**So that** I don't lose work if the browser crashes

**Acceptance Criteria:**
- [ ] Stage updates are saved immediately
- [ ] Configuration changes are saved immediately
- [ ] No manual "Save" button required
- [ ] Save confirmation is shown briefly
- [ ] Failed saves trigger retry and alert

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-2.1

---

### US-13.3: Enable Crash Recovery

**As a** user  
**I want** the system to recover gracefully from crashes  
**So that** I can resume work without data loss

**Acceptance Criteria:**
- [ ] Unsaved changes are recovered from local storage
- [ ] User is prompted to restore session after crash
- [ ] Recovery works for browser crashes and network failures
- [ ] Recovery is tested regularly
- [ ] Recovery logs are maintained

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-13.2

---

### US-13.4: Implement Automated Database Backups

**As a** system administrator  
**I want** automated daily database backups  
**So that** data can be restored in case of failure

**Acceptance Criteria:**
- [ ] Backups run automatically every 24 hours
- [ ] Backups are stored in secure location
- [ ] Backups are tested monthly for restorability
- [ ] Backup retention policy is configurable
- [ ] Backup failures trigger alerts

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** None

---

### US-13.5: Monitor Errors and System Health

**As a** system administrator  
**I want** to be alerted when errors occur  
**So that** I can fix issues before they impact users

**Acceptance Criteria:**
- [ ] Error monitoring service is integrated (e.g., Sentry)
- [ ] Errors are categorized by severity
- [ ] Critical errors trigger immediate alerts
- [ ] Error trends are tracked
- [ ] Error dashboard is available

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** None

---

### US-13.6: Maintain Persistent Kiosk Sessions

**As a** kiosk workstation  
**I want** my session to persist even after browser crashes  
**So that** nurses don't have to re-login

**Acceptance Criteria:**
- [ ] Kiosk session token is stored persistently
- [ ] Session is restored automatically after browser restart
- [ ] Session restoration is logged
- [ ] Session can be manually cleared if needed
- [ ] Session restoration works within 1 second

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-5.3

---

### US-13.7: Auto-Reconnect After Network Drop

**As a** user  
**I want** the system to automatically reconnect after network interruption  
**So that** I don't have to manually refresh

**Acceptance Criteria:**
- [ ] System detects network disconnection
- [ ] Reconnection is attempted automatically
- [ ] User is notified of disconnection and reconnection
- [ ] Pending actions are queued and sent after reconnection
- [ ] Reconnection works within 5 seconds of network restoration

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-16.3

---

### US-13.8: System Health Dashboard

**As a** system administrator  
**I want** to monitor system health metrics  
**So that** I can proactively address issues

**Acceptance Criteria:**
- [ ] Dashboard shows: CPU, memory, disk usage
- [ ] Dashboard shows: active users, request rate
- [ ] Dashboard shows: database connection pool status
- [ ] Alerts trigger when thresholds are exceeded
- [ ] Health metrics are logged for trend analysis

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-13.5

---

### US-13.9: Code Quality & Testing

**As a** developer  
**I want** automated tests and code quality checks  
**So that** we maintain code quality

**Acceptance Criteria:**
- [ ] Unit test coverage >80%
- [ ] Integration tests for critical paths
- [ ] Linting and formatting are automated
- [ ] CI/CD pipeline runs tests on every commit
- [ ] Test results are visible in pull requests

**Priority:** P1 (High)  
**Story Points:** 13  
**Dependencies:** None

---

### US-13.10: Performance Testing & Benchmarking

**As a** system administrator  
**I want** performance benchmarks and load testing  
**So that** I know the system can handle peak load

**Acceptance Criteria:**
- [ ] Load tests simulate 100 concurrent users
- [ ] Performance benchmarks are documented
- [ ] System handles 50 beds with <2s response time
- [ ] Database queries are optimized (indexed)
- [ ] Performance regression tests are automated

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-13.1

---

### US-13.11: Cross-Browser Compatibility

**As a** user  
**I want** the system to work on all major browsers  
**So that** I can use my preferred browser

**Acceptance Criteria:**
- [ ] Works on Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] Graceful degradation for older browsers
- [ ] Browser compatibility is tested in CI/CD
- [ ] Unsupported browsers show warning message
- [ ] Browser usage is tracked in analytics

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-1.1

---

### US-13.12: Disaster Recovery Plan & Testing

**As a** system administrator  
**I want** a tested disaster recovery plan  
**So that** we can recover from catastrophic failures

**Acceptance Criteria:**
- [ ] Recovery Time Objective (RTO) is <4 hours
- [ ] Recovery Point Objective (RPO) is <1 hour
- [ ] Disaster recovery is tested quarterly
- [ ] Backup restoration is documented
- [ ] DR plan is reviewed and updated annually

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-13.4

---

## EPIC 14: Data Retention & Archival

### US-14.1: Archive Old Data

**As a** system administrator  
**I want** data older than 2 years to be archived  
**So that** the system remains fast

**Acceptance Criteria:**
- [ ] Archival runs automatically monthly
- [ ] Data older than 2 years (configurable) is moved to archive table
- [ ] Archived data is still queryable (but slower)
- [ ] Archival process is logged
- [ ] Archival can be triggered manually

**Priority:** P2 (Medium)  
**Story Points:** 8  
**Dependencies:** US-3.2

---

### US-14.2: Define Retention Policy

**As a** compliance officer  
**I want** to configure how long data is retained  
**So that** we comply with legal requirements

**Acceptance Criteria:**
- [ ] Retention period is configurable (default 7 years)
- [ ] Different retention periods can be set for different data types
- [ ] Data is automatically deleted after retention period
- [ ] Deletion is logged and irreversible
- [ ] Deletion requires admin approval

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-14.1

---

### US-14.3: Retrieve Historical Data

**As a** auditor  
**I want** to retrieve archived data for specific dates  
**So that** I can conduct historical audits

**Acceptance Criteria:**
- [ ] Archived data is searchable by date range
- [ ] Retrieval may take longer than active data
- [ ] Retrieved data is displayed in same format as active data
- [ ] Retrieval is logged
- [ ] Retrieval is available to authorized users only

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-14.1

---

### US-14.4: Optimize Storage

**As a** system administrator  
**I want** the system to optimize storage usage  
**So that** costs are minimized

**Acceptance Criteria:**
- [ ] Old logs are compressed
- [ ] Duplicate data is deduplicated
- [ ] Storage usage is monitored
- [ ] Storage alerts trigger when threshold is reached
- [ ] Storage optimization runs automatically

**Priority:** P3 (Low)  
**Story Points:** 5  
**Dependencies:** US-14.1

---

## EPIC 15: Notifications & Alerts

### US-15.1: Highlight Delayed Beds Visually

**As a** nurse  
**I want** delayed beds to be visually distinct  
**So that** I notice them immediately

**Acceptance Criteria:**
- [ ] Delayed beds have red background
- [ ] Delayed beds appear at top of list (if sorted)
- [ ] Delay duration is prominently displayed
- [ ] Visual highlight is consistent across all views
- [ ] Highlight is accessible (not color-only)

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** US-4.2

---

### US-15.2: Display Delayed Bed Count

**As a** nurse supervisor  
**I want** to see a count of delayed beds at a glance  
**So that** I know the current backlog

**Acceptance Criteria:**
- [ ] Delayed bed count is displayed prominently on dashboard
- [ ] Count updates in real-time
- [ ] Count is color-coded (green/yellow/red based on threshold)
- [ ] Clicking count filters to show only delayed beds
- [ ] Count is visible on all pages

**Priority:** P1 (High)  
**Story Points:** 3  
**Dependencies:** US-3.3

---

### US-15.3: Show Escalation Indicators

**As a** nurse supervisor  
**I want** to see which delayed beds are approaching critical thresholds  
**So that** I can escalate appropriately

**Acceptance Criteria:**
- [ ] Beds delayed >4 hours show escalation indicator
- [ ] Escalation threshold is configurable
- [ ] Escalation indicator is visually distinct (e.g., icon)
- [ ] Escalation count is shown separately
- [ ] Escalation triggers can be customized

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-15.1

---

### US-15.4: Provide Supervisor Alert Screen

**As a** supervisor  
**I want** a dedicated alert screen showing all issues  
**So that** I can monitor the ward from my office

**Acceptance Criteria:**
- [ ] Alert screen shows: delayed beds, escalations, system errors
- [ ] Alert screen updates in real-time
- [ ] Alerts are sortable by severity
- [ ] Alerts can be acknowledged
- [ ] Alert screen is accessible from main menu

**Priority:** P2 (Medium)  
**Story Points:** 8  
**Dependencies:** US-15.2, US-15.3

---

### US-15.5: Configure Notification Preferences

**As a** supervisor  
**I want** to configure which alerts I receive  
**So that** I'm not overwhelmed with notifications

**Acceptance Criteria:**
- [ ] User can enable/disable specific alert types
- [ ] User can set alert thresholds
- [ ] Preferences are saved per user
- [ ] Default preferences are sensible
- [ ] Preferences can be reset to defaults

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-15.1, US-5.1

---

## EPIC 16: Offline & Network Failure Mode

### US-16.1: Cache Data Locally

**As a** system  
**I want** to cache dashboard data locally  
**So that** the system can function during network outages

**Acceptance Criteria:**
- [ ] Dashboard data is cached in browser storage
- [ ] Cache is updated on every data fetch
- [ ] Cache is used when network is unavailable
- [ ] Cache expiry is configurable
- [ ] Cache size is limited to prevent browser issues

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-1.2

---

### US-16.2: Enable Offline UI

**As a** user  
**I want** to continue using the system during network outages  
**So that** work is not interrupted

**Acceptance Criteria:**
- [ ] Offline mode is detected automatically
- [ ] Offline indicator is displayed
- [ ] Read-only operations work offline
- [ ] Write operations are queued for sync
- [ ] User is warned about offline limitations

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-16.1

---

### US-16.3: Sync Data on Reconnect

**As a** system  
**I want** to sync queued changes when network is restored  
**So that** no data is lost

**Acceptance Criteria:**
- [ ] Queued changes are sent automatically on reconnect
- [ ] Sync progress is shown to user
- [ ] Sync conflicts are detected
- [ ] Sync failures are logged and retried
- [ ] User is notified when sync is complete

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-16.2

---

### US-16.4: Resolve Sync Conflicts

**As a** system  
**I want** to resolve conflicts when offline changes clash with server data  
**So that** data integrity is maintained

**Acceptance Criteria:**
- [ ] Conflicts are detected by comparing timestamps
- [ ] User is prompted to resolve conflicts manually
- [ ] Conflict resolution options: keep local, keep server, merge
- [ ] Conflict resolution is logged
- [ ] Unresolved conflicts prevent sync

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-16.3

---

## EPIC 17: Security & Privacy

### US-17.1: Enforce HTTPS

**As a** security officer  
**I want** all traffic to be encrypted with HTTPS  
**So that** data cannot be intercepted

**Acceptance Criteria:**
- [ ] HTTPS is enforced on all pages
- [ ] HTTP requests are redirected to HTTPS
- [ ] Valid SSL certificate is installed
- [ ] Certificate auto-renewal is configured
- [ ] Mixed content warnings are resolved

**Priority:** P0 (Critical)  
**Story Points:** 3  
**Dependencies:** None

---

### US-17.2: Encrypt Sensitive Data at Rest

**As a** security officer  
**I want** sensitive data to be encrypted in the database  
**So that** data breaches don't expose information

**Acceptance Criteria:**
- [ ] Passwords are hashed with bcrypt or similar
- [ ] Sensitive fields are encrypted (e.g., AES-256)
- [ ] Encryption keys are stored securely (not in code)
- [ ] Encryption is transparent to application
- [ ] Encryption performance is acceptable

**Priority:** P0 (Critical)  
**Story Points:** 8  
**Dependencies:** None

---

### US-17.3: Implement Access Policies

**As a** system administrator  
**I want** to define granular access policies  
**So that** users only see what they're authorized to see

**Acceptance Criteria:**
- [ ] Policies are defined per role
- [ ] Policies control read/write/delete permissions
- [ ] Policies are enforced on backend (not just UI)
- [ ] Policy violations are logged
- [ ] Policies are auditable

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** US-5.2

---

### US-17.4: Host on Secure Infrastructure

**As a** system administrator  
**I want** the system to be hosted on secure, compliant infrastructure  
**So that** we meet hospital IT requirements

**Acceptance Criteria:**
- [ ] Hosting provider is HIPAA-compliant (if applicable)
- [ ] Infrastructure has DDoS protection
- [ ] Infrastructure has firewall and intrusion detection
- [ ] Infrastructure has regular security updates
- [ ] Infrastructure has 99.9% uptime SLA

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** None

---

### US-17.5: Conduct Vulnerability Checks

**As a** security officer  
**I want** regular vulnerability scans  
**So that** security issues are identified and fixed

**Acceptance Criteria:**
- [ ] Automated vulnerability scans run weekly
- [ ] Scan results are reviewed by security team
- [ ] Critical vulnerabilities are fixed within 48 hours
- [ ] Scan reports are archived
- [ ] Scan tools are kept up-to-date

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** None

---

### US-17.6: Scrub PII from Inputs

**As a** compliance officer  
**I want** the system to prevent accidental entry of patient-identifiable information  
**So that** we avoid HIPAA violations

**Acceptance Criteria:**
- [ ] Input validation detects potential PII (names, IDs)
- [ ] Warning is shown if PII is detected
- [ ] PII is blocked from being saved
- [ ] Detection uses pattern matching and ML
- [ ] False positives can be overridden by supervisor

**Priority:** P0 (Critical)  
**Story Points:** 8  
**Dependencies:** US-1.7

---

### US-17.7: Use Dropdown-Only for Delay Reasons

**As a** compliance officer  
**I want** "Reason for Delay" to be dropdown-only (no free text)  
**So that** nurses cannot accidentally type patient names

**Acceptance Criteria:**
- [ ] Delay reason field is dropdown only
- [ ] Dropdown has predefined options
- [ ] No free text input is allowed
- [ ] Dropdown options are configurable by admin
- [ ] Dropdown is mandatory when delay is flagged

**Priority:** P0 (Critical)  
**Story Points:** 2  
**Dependencies:** US-1.7

---

### US-17.8: Implement Clinical Data Safety Valve

**As a** system  
**I want** to block any identifiable information from being stored  
**So that** the system remains compliant with privacy laws

**Acceptance Criteria:**
- [ ] All text inputs are scanned for PII
- [ ] Blocked patterns include: names, phone numbers, medical record numbers
- [ ] Blocking is enforced on backend
- [ ] Blocked attempts are logged
- [ ] Admin can review and whitelist false positives

**Priority:** P0 (Critical)  
**Story Points:** 8  
**Dependencies:** US-17.6

---

## EPIC 18: Deployment, Training & Documentation

### US-18.1: Create Installation Guide

**As a** system administrator  
**I want** a step-by-step installation guide  
**So that** I can deploy the system without developer help

**Acceptance Criteria:**
- [ ] Guide covers all deployment steps
- [ ] Guide includes prerequisites and dependencies
- [ ] Guide has screenshots and examples
- [ ] Guide is tested on fresh environment
- [ ] Guide is kept up-to-date with releases

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** None

---

### US-18.2: Develop Training Materials

**As a** trainer  
**I want** training materials for nurses and supervisors  
**So that** I can onboard staff efficiently

**Acceptance Criteria:**
- [ ] Training materials include: slides, videos, quick reference cards
- [ ] Materials cover all user roles
- [ ] Materials are available in multiple formats
- [ ] Materials are accessible (e.g., subtitles for videos)
- [ ] Materials are updated with each release

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** None

---

### US-18.3: Write User Manuals

**As a** user  
**I want** a comprehensive user manual  
**So that** I can learn how to use the system

**Acceptance Criteria:**
- [ ] Manual covers all features
- [ ] Manual has table of contents and index
- [ ] Manual has screenshots and examples
- [ ] Manual is available as PDF and web page
- [ ] Manual is searchable

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** None

---

### US-18.4: Provide In-App Help Screens

**As a** user  
**I want** help screens accessible from within the app  
**So that** I can get help without leaving the system

**Acceptance Criteria:**
- [ ] Help icon is visible on all pages
- [ ] Help content is contextual to current page
- [ ] Help includes tooltips and guided tours
- [ ] Help is searchable
- [ ] Help can be dismissed and reopened

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** None

---

### US-18.5: Create Admin Handbook

**As a** system administrator  
**I want** an admin handbook covering configuration and maintenance  
**So that** I can manage the system effectively

**Acceptance Criteria:**
- [ ] Handbook covers: configuration, backups, troubleshooting, security
- [ ] Handbook has troubleshooting section with common issues
- [ ] Handbook includes command references
- [ ] Handbook is version-controlled
- [ ] Handbook is updated with each release

**Priority:** P1 (High)  
**Story Points:** 8  
**Dependencies:** None

---

### US-18.6: Conduct Staff Training Sessions

**As a** hospital administrator  
**I want** staff to be trained in under 45 minutes  
**So that** adoption is quick and smooth

**Acceptance Criteria:**
- [ ] Training session is 45 minutes or less
- [ ] Training covers all essential features
- [ ] Training includes hands-on practice
- [ ] Training materials are provided to attendees
- [ ] Training effectiveness is measured (quiz or feedback)

**Priority:** P1 (High)  
**Story Points:** 5  
**Dependencies:** US-18.2

---

### US-18.7: Ensure Active System Usage

**As a** project manager  
**I want** to monitor system adoption  
**So that** I can ensure the system is actually being used

**Acceptance Criteria:**
- [ ] Usage metrics are tracked (logins, updates, reports)
- [ ] Usage dashboard is available to admins
- [ ] Low usage triggers follow-up training
- [ ] Usage trends are reported monthly
- [ ] Feedback mechanism is available to users

**Priority:** P2 (Medium)  
**Story Points:** 5  
**Dependencies:** US-12.1

---

## EPIC 19: External Integration & APIs

### US-19.1: REST API for External Systems

**As a** hospital IT administrator  
**I want** a REST API to integrate with other hospital systems  
**So that** data can flow between systems

**Acceptance Criteria:**
- [ ] API endpoints for bed status (read-only)
- [ ] API endpoints for reports (read-only)
- [ ] API authentication using API keys
- [ ] API rate limiting is implemented
- [ ] API documentation is available (Swagger/OpenAPI)

**Priority:** P2 (Medium)  
**Story Points:** 13  
**Dependencies:** US-5.1, US-17.1

---

### US-19.2: Webhook Support for Real-Time Events

**As a** integration developer  
**I want** to receive webhooks when critical events occur  
**So that** external systems can react in real-time

**Acceptance Criteria:**
- [ ] Webhooks can be configured for specific events
- [ ] Events include: bed status change, delay threshold exceeded
- [ ] Webhook delivery is retried on failure
- [ ] Webhook logs are maintained
- [ ] Webhook security uses HMAC signatures

**Priority:** P3 (Low)  
**Story Points:** 8  
**Dependencies:** US-19.1

---

## Summary Statistics

**Total User Stories:** 152  
**Total Story Points:** ~755

### By Priority:
- **P0 (Critical):** 30 stories
- **P1 (High):** 75 stories
- **P2 (Medium):** 40 stories
- **P3 (Low):** 7 stories

### By Epic:
- **EPIC 0:** 5 stories (Foundation & Setup) ⚡ **Critical for Day 1**
- **EPIC 1:** 9 stories (Nurse Desk Dashboard)
- **EPIC 2:** 6 stories (One-Click Stage Updates)
- **EPIC 3:** 6 stories (Time Tracking & Logging)
- **EPIC 4:** 7 stories (Color Coding & Visual Alerts)
- **EPIC 5:** 7 stories (Authentication & Roles)
- **EPIC 6:** 5 stories (Bed & Workflow Configuration)
- **EPIC 7:** 4 stories (Error Handling)
- **EPIC 8:** 4 stories (Shift Management)
- **EPIC 9:** 6 stories (AI Summary Generator)
- **EPIC 10:** 7 stories (Management Dashboard)
- **EPIC 11:** 5 stories (Export & Sharing)
- **EPIC 12:** 4 stories (Audit Logs)
- **EPIC 13:** 12 stories (Performance & Reliability)
- **EPIC 14:** 4 stories (Data Retention)
- **EPIC 15:** 5 stories (Notifications & Alerts)
- **EPIC 16:** 4 stories (Offline Mode)
- **EPIC 17:** 8 stories (Security & Privacy)
- **EPIC 18:** 7 stories (Deployment & Training)
- **EPIC 19:** 2 stories (External Integration & APIs)

---

## Next Steps

1. **Sprint Planning:** Prioritize stories for Sprint 1 (focus on P0 stories)
2. **Estimation Refinement:** Review story points with development team
3. **Dependency Mapping:** Create dependency graph for sprint planning
4. **Acceptance Criteria Review:** Validate with stakeholders
5. **GitHub Issues:** Create GitHub issues from these user stories
6. **Technical Design:** Create technical design documents for complex stories

---

## Appendix A: Story Estimation Guide

**1 Point:** Trivial change, <2 hours  
**2 Points:** Simple change, <4 hours  
**3 Points:** Moderate change, ~1 day  
**5 Points:** Complex change, 2-3 days  
**8 Points:** Very complex, ~1 week  
**13 Points:** Epic-level, needs breakdown into smaller stories

---

## Appendix B: Priority Definitions

**P0 (Critical):** Must have for MVP, blocks other work, system cannot function without it  
**P1 (High):** Important for production release, significant value to users  
**P2 (Medium):** Nice to have, can be deferred to later sprints  
**P3 (Low):** Future enhancement, low priority, quality of life improvements

---

## Appendix C: Glossary

**TAT:** Turnaround Time - Time from patient discharge to bed ready for next patient  
**PII:** Personally Identifiable Information - Data that can identify a specific individual  
**WCAG:** Web Content Accessibility Guidelines - Standards for accessible web content  
**RTO:** Recovery Time Objective - Maximum acceptable time to restore service  
**RPO:** Recovery Point Objective - Maximum acceptable data loss  
**HIPAA:** Health Insurance Portability and Accountability Act - US healthcare privacy law  
**MVP:** Minimum Viable Product - Smallest feature set for initial release  
**CI/CD:** Continuous Integration/Continuous Deployment - Automated build and deploy pipeline

---

## Appendix D: Recommended Sprint 1 Backlog (MVP Foundation)

**Sprint 1 Goal:** Establish system foundation and core dashboard functionality

### Sprint 1 Stories (52 Story Points):

1. **US-0.2:** Database Schema Management (8 points) - P0
2. **US-0.1:** CLI-Based Initial Configuration (3 points) - P0
3. **US-0.3:** Environment Configuration Management (5 points) - P0
4. **US-0.4:** Initial Seed Data for Hospital Layout (3 points) - P0
5. **US-5.1:** Implement User Login System (5 points) - P0
6. **US-5.2:** Define User Roles and Permissions (5 points) - P0
7. **US-5.7:** Manage Users (5 points) - P0
8. **US-1.1:** View All Emergency Beds in Grid Layout (5 points) - P0
9. **US-2.1:** Update Patient Stage with Single Click (5 points) - P0
10. **US-3.1:** Capture Patient Entry Time (3 points) - P0
11. **US-3.2:** Log Stage Transition Timestamps (5 points) - P0
12. **US-0.5:** Database Health Check & System Offline Banner (5 points) - P0

**Total: 57 points**

**Note:** US-0.5 (Database Health Check) should be implemented early to ensure system reliability from Day 1. This is critical for hospital operations where staff need immediate feedback if the system fails.

---

### Sprint 2 Stories (55 Story Points):

**Sprint 2 Goal:** Complete core dashboard features with real-time updates and visual indicators

1. **US-1.2:** Display Real-Time Bed Status (8 points) - P0 - *Depends on: US-1.1*
2. **US-2.2:** Validate Stage Transitions (5 points) - P0 - *Depends on: US-2.1*
3. **US-2.3:** Reset Bed on Patient Discharge (3 points) - P0 - *Depends on: US-2.1, US-3.2*
4. **US-3.3:** Calculate Total Duration and Detect Delays (5 points) - P0 - *Depends on: US-3.1, US-3.2*
5. **US-1.3:** Show Elapsed Time Per Bed (3 points) - P0 - *Depends on: US-3.1, US-3.2*
6. **US-6.2:** Configure Stage Names and Workflow (5 points) - P0 - *Depends on: US-5.2*
7. **US-4.1:** Define Stage-Based Color Mapping (3 points) - P0 - *Depends on: US-6.2*
8. **US-1.4:** Color Code Beds by Stage (3 points) - P0 - *Depends on: US-1.1, US-4.1*
9. **US-4.2:** Highlight Delayed Beds in Red (3 points) - P0 - *Depends on: US-3.3, US-4.1*
10. **US-6.1:** Add, Edit, and Remove Beds (5 points) - P0 - *Depends on: US-5.2*
11. **US-6.3:** Set Time Thresholds (3 points) - P0 - *Depends on: US-6.2*
12. **US-5.6:** Implement Secure Logout (2 points) - P1 - *Depends on: US-5.1*
13. **US-2.6:** Provide Optional Confirmation Prompts (3 points) - P2 - *Depends on: US-2.1*
14. **US-4.4:** Display Color Legend (2 points) - P1 - *Depends on: US-4.1*
15. **US-1.9:** Search Beds by Number or Status (3 points) - P2 - *Depends on: US-1.1*

**Total: 55 points**

**Deliverables:** Fully functional dashboard with color-coded beds, real-time updates, stage validation, and basic configuration capabilities.

---

### Sprint 3 Stories (58 Story Points):

**Sprint 3 Goal:** Enhanced workflow features, error handling, and advanced dashboard capabilities

1. **US-1.5:** Filter and Sort Delayed Beds (5 points) - P1 - *Depends on: US-1.3, US-3.3*
2. **US-1.6:** Track Disposition Bottlenecks (5 points) - P1 - *Depends on: US-1.1, US-2.1*
3. **US-1.7:** Display Reason for Delay (3 points) - P1 - *Depends on: US-1.6*
4. **US-2.4:** Track Bed Cleaning and Turnaround Time (5 points) - P1 - *Depends on: US-2.3*
5. **US-3.4:** Track Bed Turnaround Time (TAT) (5 points) - P1 - *Depends on: US-2.3, US-2.4*
6. **US-3.5:** Attribute Delays to Root Causes (5 points) - P1 - *Depends on: US-1.7, US-3.3*
7. **US-7.1:** Undo Last Action (3 points) - P1 - *Depends on: US-2.1*
8. **US-7.2:** Edit Stage History with Supervisor Approval (5 points) - P1 - *Depends on: US-5.2, US-3.2*
9. **US-7.3:** Maintain Correction Audit Trail (3 points) - P1 - *Depends on: US-7.2*
10. **US-7.4:** Require Reason for Manual Corrections (3 points) - P1 - *Depends on: US-7.2*
11. **US-5.3:** Enable Kiosk Mode for Nurse Desk (5 points) - P1 - *Depends on: US-5.1*
12. **US-5.4:** Implement Persistent Sessions (3 points) - P1 - *Depends on: US-5.1*
13. **US-1.8:** Mobile-Responsive Dashboard (8 points) - P1 - *Depends on: US-1.1*
14. **US-2.5:** Enable Housekeeping Mode (5 points) - P2 - *Depends on: US-2.4, US-5.1*

**Total: 58 points**

**Deliverables:** Advanced workflow management, error correction system, mobile support, and enhanced tracking capabilities.

---

### Sprint 4 Stories (60 Story Points):

**Sprint 4 Goal:** Shift management, audit logging, and accessibility compliance

1. **US-8.1:** Define Shift Schedules (3 points) - P1 - *Depends on: US-5.2*
2. **US-8.2:** Auto-Generate Shift Summary Reports (5 points) - P1 - *Depends on: US-8.1, US-3.2*
3. **US-8.3:** Track Shift Handover Notes (3 points) - P1 - *Depends on: US-8.1*
4. **US-8.4:** Display Shift Performance Metrics (5 points) - P1 - *Depends on: US-8.2*
5. **US-12.1:** Log All User Actions (5 points) - P1 - *Depends on: US-5.1*
6. **US-12.2:** Provide Audit Log Search and Filter (5 points) - P1 - *Depends on: US-12.1*
7. **US-12.3:** Export Audit Logs for Compliance (3 points) - P1 - *Depends on: US-12.1*
8. **US-12.4:** Retain Audit Logs Indefinitely (3 points) - P1 - *Depends on: US-12.1*
9. **US-3.6:** Maintain Historical Stage Logs (5 points) - P1 - *Depends on: US-3.2, US-14.1*
10. **US-4.5:** Ensure Accessibility Compliance (5 points) - P1 - *Depends on: US-4.1*
11. **US-4.7:** Accessibility Audit & Compliance (8 points) - P1 - *Depends on: US-4.5*
12. **US-6.5:** Create Ad-Hoc Temporary Beds (3 points) - P1 - *Depends on: US-6.1*
13. **US-6.6:** Support Virtual Beds for Hallway Patients (5 points) - P1 - *Depends on: US-6.1*
14. **US-5.5:** Provide Password Reset Functionality (5 points) - P2 - *Depends on: US-5.1*
15. **US-4.3:** Add Blinking Animation for Critical Delays (3 points) - P2 - *Depends on: US-4.2*

**Total: 61 points**

**Deliverables:** Complete shift management, comprehensive audit system, accessibility compliance, and flexible bed configuration.

---

### Sprint 5 Stories (62 Story Points):

**Sprint 5 Goal:** Management reporting, data retention, and performance optimization

1. **US-10.1:** View Daily Summary Dashboard (5 points) - P1 - *Depends on: US-3.2, US-8.2*
2. **US-10.2:** Display Key Performance Indicators (KPIs) (5 points) - P1 - *Depends on: US-10.1*
3. **US-10.3:** Visualize Patient Flow Trends (8 points) - P1 - *Depends on: US-10.1*
4. **US-10.4:** Identify Bottleneck Stages (5 points) - P1 - *Depends on: US-10.3*
5. **US-10.5:** Compare Shift Performance (5 points) - P1 - *Depends on: US-8.2, US-10.1*
6. **US-10.6:** Filter Reports by Date Range (3 points) - P1 - *Depends on: US-10.1*
7. **US-10.7:** Drill Down into Specific Beds (3 points) - P1 - *Depends on: US-10.1*
8. **US-14.1:** Archive Old Patient Records (5 points) - P1 - *Depends on: US-3.2*
9. **US-14.2:** Implement Data Retention Policies (3 points) - P1 - *Depends on: US-14.1*
10. **US-14.3:** Provide Archive Search and Retrieval (5 points) - P1 - *Depends on: US-14.1*
11. **US-14.4:** Automated Data Cleanup (3 points) - P2 - *Depends on: US-14.2*
12. **US-13.1:** Optimize Database Queries (5 points) - P1 - *Depends on: US-1.2*
13. **US-13.2:** Implement Caching Strategy (5 points) - P1 - *Depends on: US-13.1*
14. **US-13.3:** Load Test for 100 Concurrent Users (5 points) - P1 - *Depends on: US-13.1*

**Total: 65 points**

**Deliverables:** Management dashboard with analytics, data archival system, and performance optimizations.

---

### Sprint 6 Stories (58 Story Points):

**Sprint 6 Goal:** AI reporting, export capabilities, and notifications

1. **US-9.1:** Generate Daily Text Summary (8 points) - P1 - *Depends on: US-10.1*
2. **US-9.2:** Highlight Key Insights and Anomalies (5 points) - P1 - *Depends on: US-9.1*
3. **US-9.3:** Suggest Process Improvements (5 points) - P1 - *Depends on: US-9.1, US-10.4*
4. **US-9.4:** Email Daily Summary to Management (3 points) - P1 - *Depends on: US-9.1*
5. **US-9.5:** Customize AI Report Templates (5 points) - P2 - *Depends on: US-9.1*
6. **US-9.6:** Multi-Language Support for Reports (5 points) - P2 - *Depends on: US-9.1*
7. **US-11.1:** Export Reports as PDF (5 points) - P1 - *Depends on: US-10.1*
8. **US-11.2:** Export Reports as CSV/Excel (3 points) - P1 - *Depends on: US-10.1*
9. **US-11.3:** Schedule Automated Report Delivery (5 points) - P1 - *Depends on: US-11.1*
10. **US-11.4:** Share Reports via Secure Link (3 points) - P2 - *Depends on: US-11.1*
11. **US-11.5:** Print-Optimized Report Layout (3 points) - P2 - *Depends on: US-11.1*
12. **US-15.1:** Send Delay Threshold Alerts (5 points) - P1 - *Depends on: US-3.3*
13. **US-15.2:** Configure Alert Recipients (3 points) - P1 - *Depends on: US-15.1*
14. **US-15.3:** Support Multiple Alert Channels (5 points) - P2 - *Depends on: US-15.1*

**Total: 63 points**

**Deliverables:** AI-powered daily reports, comprehensive export system, and automated alerting.

---

### Sprint 7 Stories (55 Story Points):

**Sprint 7 Goal:** Security hardening, offline mode, and advanced notifications

1. **US-17.1:** Implement HTTPS/TLS Encryption (5 points) - P0 - *Depends on: None*
2. **US-17.2:** Encrypt Sensitive Data at Rest (8 points) - P1 - *Depends on: US-17.1*
3. **US-17.3:** Implement Rate Limiting (3 points) - P1 - *Depends on: US-5.1*
4. **US-17.4:** Add CSRF Protection (3 points) - P1 - *Depends on: US-5.1*
5. **US-17.5:** Implement SQL Injection Prevention (3 points) - P1 - *Depends on: US-0.2*
6. **US-17.6:** Add XSS Protection (3 points) - P1 - *Depends on: US-1.1*
7. **US-17.7:** Conduct Security Audit (8 points) - P1 - *Depends on: US-17.1-17.6*
8. **US-17.8:** Implement Data Anonymization (5 points) - P2 - *Depends on: US-17.2*
9. **US-16.1:** Enable Offline Dashboard View (8 points) - P1 - *Depends on: US-1.2*
10. **US-16.2:** Queue Actions for Sync (5 points) - P1 - *Depends on: US-16.1*
11. **US-16.3:** Display Offline Mode Indicator (2 points) - P1 - *Depends on: US-16.1*
12. **US-16.4:** Auto-Sync on Reconnection (5 points) - P1 - *Depends on: US-16.2*
13. **US-15.4:** Acknowledge and Dismiss Alerts (3 points) - P2 - *Depends on: US-15.1*
14. **US-15.5:** Alert History and Logs (3 points) - P2 - *Depends on: US-15.1*

**Total: 64 points**

**Deliverables:** Production-grade security, offline capability, and enhanced notification system.

---

### Sprint 8 Stories (60 Story Points):

**Sprint 8 Goal:** Deployment readiness, training materials, and external integrations

1. **US-18.1:** Create Deployment Runbook (5 points) - P0 - *Depends on: US-0.1*
2. **US-18.2:** Automated Deployment Scripts (8 points) - P1 - *Depends on: US-18.1*
3. **US-18.3:** Environment-Specific Configuration (3 points) - P1 - *Depends on: US-0.3*
4. **US-18.4:** Database Backup and Restore Procedures (5 points) - P1 - *Depends on: US-0.2*
5. **US-18.5:** Create User Training Materials (5 points) - P1 - *Depends on: US-1.1*
6. **US-18.6:** Conduct User Acceptance Testing (UAT) (8 points) - P1 - *Depends on: All core features*
7. **US-18.7:** Create System Documentation (5 points) - P1 - *Depends on: All features*
8. **US-13.4:** Monitor System Health (5 points) - P1 - *Depends on: US-0.5*
9. **US-13.5:** Set Up Error Tracking (3 points) - P1 - *Depends on: US-13.4*
10. **US-13.6:** Implement Automated Backups (5 points) - P1 - *Depends on: US-18.4*
11. **US-13.7:** Database Replication (8 points) - P2 - *Depends on: US-13.6*
12. **US-19.1:** REST API for External Systems (13 points) - P2 - *Depends on: US-5.1, US-17.1*
13. **US-4.6:** Dark Mode Support (5 points) - P3 - *Depends on: US-4.1*

**Total: 78 points** *(Note: Can be split or extended into Sprint 9 if needed)*

**Deliverables:** Production deployment, comprehensive documentation, training materials, and API integration capabilities.

---

### Sprint 9+ Stories (Remaining ~180 points):

**Remaining P2/P3 Stories for Future Sprints:**

**Performance & Reliability (Remaining):**
- US-13.8: Failover and High Availability (13 points) - P2
- US-13.9: Disaster Recovery Plan (8 points) - P2
- US-13.10: Stress Test for Peak Load (5 points) - P2
- US-13.11: Optimize Frontend Bundle Size (3 points) - P2
- US-13.12: Implement CDN for Static Assets (3 points) - P3

**External Integration:**
- US-19.2: Webhook Support for Real-Time Events (8 points) - P3

**Additional Features:**
- US-12.5: Alert on Suspicious Audit Patterns (5 points) - P2

**Total Remaining:** ~45 points

---

## Sprint Summary Overview

| Sprint | Story Points | Focus Area | Key Deliverables |
|--------|-------------|------------|------------------|
| **Sprint 1** | 57 | Foundation & Core | Database, Auth, Basic Dashboard |
| **Sprint 2** | 55 | Real-time & Visuals | Live updates, Colors, Configuration |
| **Sprint 3** | 58 | Workflow & Mobile | Error handling, Mobile, Advanced tracking |
| **Sprint 4** | 61 | Shifts & Audit | Shift management, Audit logs, Accessibility |
| **Sprint 5** | 65 | Analytics & Performance | Management dashboard, Archival, Optimization |
| **Sprint 6** | 63 | AI & Exports | AI reports, Export system, Notifications |
| **Sprint 7** | 64 | Security & Offline | Security hardening, Offline mode |
| **Sprint 8** | 78 | Deployment & API | Production readiness, Documentation, APIs |
| **Sprint 9+** | 45 | Polish & Scale | High availability, Advanced features |

**Total Planned:** ~546 points across 8 sprints (MVP complete)  
**Remaining:** ~45 points for future enhancements

**Estimated Timeline:** 
- 2-week sprints = 16 weeks (4 months) for MVP
- 3-week sprints = 24 weeks (6 months) for MVP

---

**Document Status:** ✅ Production-Ready for JMCH Deployment  
**Last Updated:** 2026-02-14  
**Version:** 2.1  

**Changes from v2.0:**
- **Refined EPIC 0** for MVP deployment (removed over-engineered wizard)
- **US-0.1:** Changed from 8-point Setup Wizard to 3-point CLI Configuration
- **US-0.4:** Added Initial Seed Data for Hospital Layout (3 points) - Critical!
- **US-0.5:** Added Database Health Check & System Offline Banner (5 points) - Critical!
- **EPIC 0 Story Points:** Reduced from 21 to 19 points (more realistic for MVP)
- **Sprint 1 Backlog:** Updated to 12 stories, 57 points (includes critical health check)

**Changes from v1.0:**
- Added EPIC 0 (System Foundation) with 5 stories
- Added EPIC 19 (External Integration) with 2 stories
- Added 30+ missing user stories across all epics
- Removed duplicate US-6.4 (merged with US-4.1)
- Fixed circular dependencies
- Added appendices for estimation, priorities, and glossary
- Included Sprint 1 recommended backlog optimized for single-hospital deployment

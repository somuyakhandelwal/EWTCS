// Delay Attribution Configuration
// Epic 3: Time Tracking & Stage Logging
// Purpose: Classify delays as Emergency Staff vs Hospital Capacity

import type { DispositionDelayReason } from '../types/bed'

/** The two attribution buckets for delay root-cause analysis */
export type DelayAttribution = 'emergency_staff' | 'hospital_capacity' | 'unattributed'

export interface AttributionConfig {
  /** Stage displayOrder values that map to Emergency Staff delays */
  emergencyStaffStageOrders: number[]
  /** Disposition delay reasons that indicate Hospital Capacity issues */
  hospitalCapacityReasons: DispositionDelayReason[]
  /** Stage displayOrder of the disposition/decision stage */
  dispositionStageOrder: number
}

/**
 * Default attribution configuration.
 * Stages 1–4 (Triage, Registration, Doctor Assessment, Treatment/Observation)
 * are Emergency Staff delays.
 * Stage 5 (Decision Made) with a bed-unavailability reason is Hospital Capacity.
 *
 * This constant is the single source of truth — change it here to reconfigure
 * attribution logic without touching queries or components.
 */
export const ATTRIBUTION_CONFIG: AttributionConfig = {
  emergencyStaffStageOrders: [1, 2, 3, 4],
  hospitalCapacityReasons: [
    'no_icu_bed',
    'no_general_ward_bed',
    'no_bed_upstairs',
  ],
  dispositionStageOrder: 5,
}

/** Human-readable labels for each attribution category */
export const ATTRIBUTION_LABELS: Record<DelayAttribution, string> = {
  emergency_staff: 'Emergency Staff',
  hospital_capacity: 'Hospital Capacity',
  unattributed: 'Unattributed',
}

/** Tailwind colour tokens per attribution (bg, text, border) */
export const ATTRIBUTION_COLORS: Record<
  DelayAttribution,
  { bg: string; text: string; border: string; bar: string }
> = {
  emergency_staff: {
    bg: 'bg-orange-950/40',
    text: 'text-orange-300',
    border: 'border-orange-700/50',
    bar: 'bg-orange-500',
  },
  hospital_capacity: {
    bg: 'bg-blue-950/40',
    text: 'text-blue-300',
    border: 'border-blue-700/50',
    bar: 'bg-blue-500',
  },
  unattributed: {
    bg: 'bg-zinc-900/40',
    text: 'text-zinc-400',
    border: 'border-zinc-700/50',
    bar: 'bg-zinc-500',
  },
}

/**
 * Pure function — determine the attribution for a single delay incident.
 * @param stageDisplayOrder - display_order of the stage where delay occurred
 * @param reason - disposition delay reason (if any) recorded by nurse
 * @param config - override attribution config (defaults to ATTRIBUTION_CONFIG)
 */
export function getAttributionForDelay(
  stageDisplayOrder: number,
  reason: DispositionDelayReason | null,
  config: AttributionConfig = ATTRIBUTION_CONFIG
): DelayAttribution {
  // Stages 1–4 are always Emergency Staff
  if (config.emergencyStaffStageOrders.includes(stageDisplayOrder)) {
    return 'emergency_staff'
  }

  // Stage 5 (Decision Made) — depends on the recorded reason
  if (stageDisplayOrder === config.dispositionStageOrder) {
    if (reason && config.hospitalCapacityReasons.includes(reason)) {
      return 'hospital_capacity'
    }
    // Stage 5 but reason is staff-type or not recorded → unattributed
    return 'unattributed'
  }

  return 'unattributed'
}

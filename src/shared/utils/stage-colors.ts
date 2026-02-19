/**
 * stage-colors.ts
 * Shared utility for stage color classes used across the application.
 *
 * Moved from: src/features/bed-dashboard/lib/utils.ts
 * Location:   src/shared/utils/stage-colors.ts
 *
 * Usage:
 *   import { getStageColorClasses } from '@/shared/utils/stage-colors';
 *   const { bg, text, border } = getStageColorClasses(stage.colorCode);
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StageColor =
  | 'gray'
  | 'blue'
  | 'cyan'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'purple'
  | 'pink'
  | 'red'

export interface StageColorClasses {
  bg: string
  text: string
  border: string
}

// ---------------------------------------------------------------------------
// Color map — module-level constant to avoid recreation on every call
// (same pattern as the original bed-dashboard/lib/utils.ts)
// ---------------------------------------------------------------------------

const STAGE_COLOR_MAP: Record<StageColor, StageColorClasses> = {
  gray: {
    bg: 'bg-zinc-900/60',
    text: 'text-zinc-200',
    border: 'border-zinc-600',
  },
  blue: {
    bg: 'bg-blue-900/60',
    text: 'text-blue-200',
    border: 'border-blue-600',
  },
  cyan: {
    bg: 'bg-cyan-900/60',
    text: 'text-cyan-200',
    border: 'border-cyan-600',
  },
  yellow: {
    bg: 'bg-yellow-900/60',
    text: 'text-yellow-200',
    border: 'border-yellow-600',
  },
  orange: {
    bg: 'bg-orange-900/60',
    text: 'text-orange-200',
    border: 'border-orange-600',
  },
  green: {
    bg: 'bg-green-900/60',
    text: 'text-green-200',
    border: 'border-green-600',
  },
  purple: {
    bg: 'bg-purple-900/60',
    text: 'text-purple-200',
    border: 'border-purple-600',
  },
  pink: {
    bg: 'bg-pink-900/60',
    text: 'text-pink-200',
    border: 'border-pink-600',
  },
  red: {
    bg: 'bg-red-900/60',
    text: 'text-red-200',
    border: 'border-red-600',
  },
} as const

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Get Tailwind color classes for a stage color code.
 *
 * @param colorCode - Color string stored in DB (e.g. "blue", "red").
 *                    Falls back to `gray` if the value is undefined,
 *                    null, empty, or unrecognised.
 *
 * @example
 * const { bg, text, border } = getStageColorClasses(bed.currentStage?.colorCode)
 * <div className={`${bg} ${text} border ${border}`}>...</div>
 */
export function getStageColorClasses(
  colorCode: string | null | undefined
): StageColorClasses {
  if (!colorCode) return STAGE_COLOR_MAP.gray
  return STAGE_COLOR_MAP[colorCode.toLowerCase() as StageColor] ?? STAGE_COLOR_MAP.gray
}

/**
 * Returns all supported stage color values.
 * Useful for populating color-picker dropdowns in admin settings.
 *
 * @example
 * getSupportedStageColors() // ['gray', 'blue', 'cyan', ...]
 */
export function getSupportedStageColors(): StageColor[] {
  return Object.keys(STAGE_COLOR_MAP) as StageColor[]
}
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
    bg: 'bg-zinc-900/60 contrast-more:bg-zinc-950',
    text: 'text-zinc-200 contrast-more:text-white font-semibold',
    border: 'border-zinc-600 contrast-more:border-zinc-300 contrast-more:border-2',
  },
  blue: {
    bg: 'bg-blue-900/60 contrast-more:bg-blue-950',
    text: 'text-blue-200 contrast-more:text-white font-semibold',
    border: 'border-blue-600 contrast-more:border-blue-300 contrast-more:border-2',
  },
  cyan: {
    bg: 'bg-cyan-900/60 contrast-more:bg-cyan-950',
    text: 'text-cyan-200 contrast-more:text-white font-semibold',
    border: 'border-cyan-600 contrast-more:border-cyan-300 contrast-more:border-2',
  },
  yellow: {
    bg: 'bg-yellow-900/60 contrast-more:bg-yellow-950',
    text: 'text-yellow-200 contrast-more:text-white font-semibold',
    border: 'border-yellow-600 contrast-more:border-yellow-300 contrast-more:border-2',
  },
  orange: {
    bg: 'bg-orange-900/60 contrast-more:bg-orange-950',
    text: 'text-orange-200 contrast-more:text-white font-semibold',
    border: 'border-orange-600 contrast-more:border-orange-300 contrast-more:border-2',
  },
  green: {
    bg: 'bg-green-900/60 contrast-more:bg-green-950',
    text: 'text-green-200 contrast-more:text-white font-semibold',
    border: 'border-green-600 contrast-more:border-green-300 contrast-more:border-2',
  },
  purple: {
    bg: 'bg-purple-900/60 contrast-more:bg-purple-950',
    text: 'text-purple-200 contrast-more:text-white font-semibold',
    border: 'border-purple-600 contrast-more:border-purple-300 contrast-more:border-2',
  },
  pink: {
    bg: 'bg-pink-900/60 contrast-more:bg-pink-950',
    text: 'text-pink-200 contrast-more:text-white font-semibold',
    border: 'border-pink-600 contrast-more:border-pink-300 contrast-more:border-2',
  },
  red: {
    bg: 'bg-red-900/60 contrast-more:bg-red-950',
    text: 'text-red-200 contrast-more:text-white font-semibold',
    border: 'border-red-600 contrast-more:border-red-300 contrast-more:border-2',
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
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
    bg: 'bg-zinc-100 dark:bg-card contrast-more:bg-zinc-200 dark:contrast-more:bg-card',
    text: 'text-zinc-800 dark:text-card-foreground contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-zinc-300 dark:border-border contrast-more:border-zinc-400 dark:contrast-more:border-zinc-400 contrast-more:border-2',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40 contrast-more:bg-blue-200 dark:contrast-more:bg-blue-950',
    text: 'text-blue-800 dark:text-blue-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-blue-300 dark:border-blue-700/50 contrast-more:border-blue-400 dark:contrast-more:border-blue-400 contrast-more:border-2',
  },
  cyan: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/40 contrast-more:bg-cyan-200 dark:contrast-more:bg-cyan-950',
    text: 'text-cyan-800 dark:text-cyan-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-cyan-300 dark:border-cyan-700/50 contrast-more:border-cyan-400 dark:contrast-more:border-cyan-400 contrast-more:border-2',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40 contrast-more:bg-yellow-200 dark:contrast-more:bg-yellow-950',
    text: 'text-yellow-800 dark:text-yellow-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-yellow-300 dark:border-yellow-700/50 contrast-more:border-yellow-400 dark:contrast-more:border-yellow-400 contrast-more:border-2',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/40 contrast-more:bg-orange-200 dark:contrast-more:bg-orange-950',
    text: 'text-orange-800 dark:text-orange-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-orange-300 dark:border-orange-700/50 contrast-more:border-orange-400 dark:contrast-more:border-orange-400 contrast-more:border-2',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/40 contrast-more:bg-green-200 dark:contrast-more:bg-green-950',
    text: 'text-green-800 dark:text-green-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-green-300 dark:border-green-700/50 contrast-more:border-green-400 dark:contrast-more:border-green-400 contrast-more:border-2',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/40 contrast-more:bg-purple-200 dark:contrast-more:bg-purple-950',
    text: 'text-purple-800 dark:text-purple-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-purple-300 dark:border-purple-700/50 contrast-more:border-purple-400 dark:contrast-more:border-purple-400 contrast-more:border-2',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/40 contrast-more:bg-pink-200 dark:contrast-more:bg-pink-950',
    text: 'text-pink-800 dark:text-pink-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-pink-300 dark:border-pink-700/50 contrast-more:border-pink-400 dark:contrast-more:border-pink-400 contrast-more:border-2',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/40 contrast-more:bg-red-200 dark:contrast-more:bg-red-950',
    text: 'text-red-800 dark:text-red-200 contrast-more:text-background dark:contrast-more:text-foreground font-semibold',
    border: 'border-red-300 dark:border-red-700/50 contrast-more:border-red-400 dark:contrast-more:border-red-400 contrast-more:border-2',
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
/**
 * stage-colors.ts
 * Shared utility for stage color classes used across the application.
 *
 * Moved from: src/features/bed-dashboard/lib/utils.ts
 * Location:   src/shared/utils/stage-colors.ts
 *
 * Usage:
 *   import { getStageColorClasses } from '@/shared/utils/stage-colors';
 *   const { bg, text, border, icon: Icon } = getStageColorClasses(stage.colorCode);
 */
import {
  BedSingle,
  Stethoscope,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  Syringe,
  HeartPulse,
  Ban,
  LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StageColor =
  | "gray"
  | "blue"
  | "cyan"
  | "yellow"
  | "orange"
  | "green"
  | "purple"
  | "pink"
  | "red";

export interface StageColorClasses {
  bg: string;
  text: string;
  border: string;
  icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// Color map — module-level constant to avoid recreation on every call
// (same pattern as the original bed-dashboard/lib/utils.ts)
// ---------------------------------------------------------------------------

const STAGE_COLOR_MAP: Record<StageColor, StageColorClasses> = {
  gray: {
    bg: "bg-zinc-900/60 contrast-more:bg-zinc-900",
    text: "text-zinc-200 contrast-more:text-white contrast-more:font-bold",
    border:
      "border-zinc-600 contrast-more:border-zinc-300 contrast-more:border-2",
    icon: BedSingle,
  },
  blue: {
    bg: "bg-blue-900/60 contrast-more:bg-blue-900",
    text: "text-blue-200 contrast-more:text-blue-100 contrast-more:font-bold",
    border:
      "border-blue-600 contrast-more:border-blue-300 contrast-more:border-2",
    icon: Stethoscope,
  },
  cyan: {
    bg: "bg-cyan-900/60 contrast-more:bg-cyan-900",
    text: "text-cyan-200 contrast-more:text-cyan-100 contrast-more:font-bold",
    border:
      "border-cyan-600 contrast-more:border-cyan-300 contrast-more:border-2",
    icon: Activity,
  },
  yellow: {
    bg: "bg-yellow-900/60 contrast-more:bg-yellow-900",
    text: "text-yellow-200 contrast-more:text-yellow-100 contrast-more:font-bold",
    border:
      "border-yellow-600 contrast-more:border-yellow-300 contrast-more:border-2",
    icon: Clock,
  },
  orange: {
    bg: "bg-orange-900/60 contrast-more:bg-orange-900",
    text: "text-orange-200 contrast-more:text-orange-100 contrast-more:font-bold",
    border:
      "border-orange-600 contrast-more:border-orange-300 contrast-more:border-2",
    icon: AlertCircle,
  },
  green: {
    bg: "bg-green-900/60 contrast-more:bg-green-900",
    text: "text-green-200 contrast-more:text-green-100 contrast-more:font-bold",
    border:
      "border-green-600 contrast-more:border-green-300 contrast-more:border-2",
    icon: CheckCircle2,
  },
  purple: {
    bg: "bg-purple-900/60 contrast-more:bg-purple-900",
    text: "text-purple-200 contrast-more:text-purple-100 contrast-more:font-bold",
    border:
      "border-purple-600 contrast-more:border-purple-300 contrast-more:border-2",
    icon: Syringe,
  },
  pink: {
    bg: "bg-pink-900/60 contrast-more:bg-pink-900",
    text: "text-pink-200 contrast-more:text-pink-100 contrast-more:font-bold",
    border:
      "border-pink-600 contrast-more:border-pink-300 contrast-more:border-2",
    icon: HeartPulse,
  },
  red: {
    bg: "bg-red-900/60 contrast-more:bg-red-900",
    text: "text-red-200 contrast-more:text-red-100 contrast-more:font-bold",
    border:
      "border-red-600 contrast-more:border-red-300 contrast-more:border-2",
    icon: Ban,
  },
} as const;

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
 * const { bg, text, border, icon: Icon } = getStageColorClasses(bed.currentStage?.colorCode)
 * <div className={`${bg} ${text} border ${border}`}>...</div>
 * <Icon className="w-4 h-4" />

 */
export function getStageColorClasses(
  colorCode: string | null | undefined,
): StageColorClasses {
  if (!colorCode) return STAGE_COLOR_MAP.gray;
  return (
    STAGE_COLOR_MAP[colorCode.toLowerCase() as StageColor] ??
    STAGE_COLOR_MAP.gray
  );
}

/**
 * Returns all supported stage color values.
 * Useful for populating color-picker dropdowns in admin settings.
 *
 * @example
 * getSupportedStageColors() // ['gray', 'blue', 'cyan', ...]
 */
export function getSupportedStageColors(): StageColor[] {
  return Object.keys(STAGE_COLOR_MAP) as StageColor[];
}

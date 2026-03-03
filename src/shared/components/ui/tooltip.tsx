import type { ReactNode } from 'react'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: TooltipSide
  wrapperClassName?: string
}

const SIDE_CLASSES: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

/**
 * Lightweight CSS-only tooltip wrapper.
 * Displays `content` on hover/focus-within using Tailwind group utility.
 * No external dependencies required.
 *
 * @example
 * <Tooltip content="Press F1 to toggle help">
 *   <Button>Help</Button>
 * </Tooltip>
 */
export function Tooltip({ content, children, side = 'top', wrapperClassName }: TooltipProps) {
  return (
    <span className={['relative group inline-flex', wrapperClassName ?? ''].join(' ').trim()}>
      {children}
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute',
          SIDE_CLASSES[side],
          'w-max max-w-[14rem] rounded-md',
          'bg-popover text-popover-foreground',
          'px-2.5 py-1.5 text-xs shadow-md',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          'transition-opacity duration-150 z-[90] text-center whitespace-normal',
        ].join(' ')}
      >
        {content}
      </span>
    </span>
  )
}

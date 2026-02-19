# Accessibility Checklist

This checklist documents how we verify WCAG 2.1 AA contrast for stage colors and dashboard UI.

## Stage Colors (Bed Dashboard)

- Confirm every stage color uses the shared map in [src/shared/utils/stage-colors.ts](../src/shared/utils/stage-colors.ts).
- Validate contrast for each stage label and badge text against its background.
- Ensure color is not the only indicator: stage name is always visible in text.

## Quick Audit Steps

1. Open the dashboard with a typical set of stages (8+ colors).
2. Check stage legend labels for readability at small text size.
3. Check bed cards, stage buttons, and stage context menu for readable text.
4. Check critical modals (confirmation + supervisor override) for readable stage tags.

## Suggested Tools

- Chrome DevTools: use the color picker and contrast ratio helper.
- Browser extensions: axe or WAVE for quick checks.

## Acceptance Criteria Mapping

- Each stage has a distinct color: verified by the shared stage color map.
- Colors are distinguishable: verify in Stage Legend and Bed Card grid.
- Legend is visible: Bed dashboard renders [BedStatusLegend].
- WCAG 2.1 AA: pass contrast checks for small text (4.5:1).
- Consistent scheme: all stage colors come from the shared map.

## Notes

- If contrast fails, update colors in the shared map and re-check all affected UI.

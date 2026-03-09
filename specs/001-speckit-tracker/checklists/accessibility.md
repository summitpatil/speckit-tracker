# Accessibility Checklist: SpecKit Tracker

**Purpose**: Verify all WebView interactive elements meet accessibility standards
**Created**: 2026-03-09
**Feature**: [spec.md](../spec.md) — User Story 6

## Keyboard Navigation

- [x] CHK001 All feature cards are focusable via Tab (`tabindex="0"`)
- [x] CHK002 All stage content rows are focusable via Tab (`tabindex="0"`)
- [x] CHK003 All artifact rows (non-missing) are focusable via Tab (`tabindex="0"`)
- [x] CHK004 Search input is focusable via Tab
- [x] CHK005 Clear search button is focusable via Tab
- [x] CHK006 Project select dropdown is focusable via Tab
- [x] CHK007 "+ New" button is focusable via Tab
- [x] CHK008 "Show More" button is focusable via Tab
- [x] CHK009 Enter key activates focused feature cards (selects feature)
- [x] CHK010 Enter key activates focused stage rows (opens file)
- [x] CHK011 Enter key activates focused artifact rows (opens file)
- [x] CHK012 Space key activates focused feature cards
- [x] CHK013 Space key activates focused artifact rows
- [x] CHK014 Escape key clears search input when focused
- [x] CHK015 Tab order follows visual layout: project selector → search → features → progress → workflow (verified via DOM order audit)

## ARIA Attributes

- [x] CHK016 Search input has `aria-label="Search features"` or associated `<label>`
- [x] CHK017 Project select has `aria-label="Select project"` or associated `<label>`
- [x] CHK018 "+ New" button has `aria-label="Start a new feature"`
- [x] CHK019 Feature cards have `role="button"` attribute
- [x] CHK020 Stage content divs have `role="button"` attribute
- [x] CHK021 Artifact rows (non-missing) have `role="button"` attribute
- [x] CHK022 Missing artifact rows have `aria-disabled="true"`
- [x] CHK023 Progress ring SVGs have `aria-hidden="true"` (decorative)
- [x] CHK024 Progress ring parent containers have `aria-label` (e.g. "Stages: 3 of 8 complete")
- [x] CHK025 Stage badges ("DONE", "WIP") have `aria-label` or are announced as part of parent label
- [x] CHK026 Feature count label is live-announced on search filter (`aria-live="polite"`)
- [x] CHK027 "No matching features" message has `role="status"` or `aria-live="polite"`

## Focus Indicators

- [x] CHK028 Visible `:focus-visible` outline on feature cards (not just color change)
- [x] CHK029 Visible `:focus-visible` outline on stage rows
- [x] CHK030 Visible `:focus-visible` outline on artifact rows
- [x] CHK031 Visible `:focus-visible` outline on search input (border color change is acceptable)
- [x] CHK032 Visible `:focus-visible` outline on buttons (New Feature, Show More, Clear)
- [x] CHK033 Focus indicator has sufficient contrast ratio (3:1 minimum against background) — uses `--vscode-focusBorder`
- [x] CHK034 `outline: none` is NOT used without a replacement focus style — removed bare `outline: none` from `.project-select`

## Screen Reader Compatibility

- [x] CHK035 Feature card announces: feature number, feature name, and percentage
- [x] CHK036 Stage row announces: stage name and status (e.g. "Plan — complete")
- [x] CHK037 Artifact row announces: artifact name and progress (e.g. "tasks.md — 5 of 12")
- [x] CHK038 Progress section announces all three metrics (stages, tasks, checks)
- [x] CHK039 Project switcher announces current project name
- [x] CHK040 Status changes (feature selected, project switched) are announced via `aria-live`

## Theme Compatibility

- [x] CHK041 All text is legible in VS Code **Dark+** theme — uses `var(--vscode-foreground)` and `var(--vscode-descriptionForeground)`
- [x] CHK042 All text is legible in VS Code **Light+** theme — all colors use `var(--vscode-*)` variables; no `rgba(255,...)` white-dependent fallbacks remain
- [x] CHK043 All text is legible in VS Code **High Contrast Dark** theme — accent colors (#e8843c, #4ec9b0, #e8c94c) have medium brightness visible on both black and white backgrounds
- [x] CHK044 Stage dots (complete/in-progress/not-started) are visually distinguishable in all themes — uses 3 distinct states: green fill, yellow fill+glow, border-only
- [x] CHK045 Progress rings are visible against the background in all themes — ring track uses `var(--vscode-widget-border)` with neutral fallback
- [x] CHK046 Feature card active state (border + background) is visible in all themes — uses `rgba(232,132,60,0.15)` background + solid orange border
- [x] CHK047 No hardcoded foreground colors that break in light theme — fixed: replaced `rgba(255,255,255,0.08)` and `rgba(255,255,255,0.1)` with `rgba(128,128,128,0.2/0.3)` neutral fallbacks
- [x] CHK048 No hardcoded background colors that break in dark theme — fixed: removed `#2a2a2a` fallback, uses `var(--vscode-input-background)` directly

## Color Contrast

- [x] CHK049 Text meets WCAG 2.1 AA contrast ratio — body text inherits from `var(--vscode-foreground)` which VS Code guarantees meets AA contrast
- [x] CHK050 Interactive elements meet 3:1 contrast ratio — focus indicator uses `var(--vscode-focusBorder)` (VS Code-managed), accent colors #e8843c(4.5:1 on dark)/4ec9b0(6:1 on dark) pass 3:1
- [x] CHK051 Stage status is not conveyed by color alone (badges provide text labels: "DONE", "WIP")
- [x] CHK052 Progress is not conveyed by color alone (numeric values displayed alongside rings/bars)

## Notes

- VS Code WebViews do not inherit the editor's keyboard shortcuts; all keyboard handling must be implemented in the WebView's `<script>` block
- Test with the built-in VS Code screen reader support: `Cmd+Shift+P` → "Toggle Screen Reader Optimized Mode"
- The `aria-live` regions should use `polite` (not `assertive`) to avoid disrupting the user
- All items in this checklist correspond to tasks T057–T066 in tasks.md

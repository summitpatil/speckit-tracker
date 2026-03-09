# Accessibility Checklist: SpecKit Tracker

**Purpose**: Verify all WebView interactive elements meet accessibility standards
**Created**: 2026-03-09
**Feature**: [spec.md](../spec.md) — User Story 6

## Keyboard Navigation

- [ ] CHK001 All feature cards are focusable via Tab (`tabindex="0"`)
- [ ] CHK002 All stage content rows are focusable via Tab (`tabindex="0"`)
- [ ] CHK003 All artifact rows (non-missing) are focusable via Tab (`tabindex="0"`)
- [ ] CHK004 Search input is focusable via Tab
- [ ] CHK005 Clear search button is focusable via Tab
- [ ] CHK006 Project select dropdown is focusable via Tab
- [ ] CHK007 "+ New" button is focusable via Tab
- [ ] CHK008 "Show More" button is focusable via Tab
- [ ] CHK009 Enter key activates focused feature cards (selects feature)
- [ ] CHK010 Enter key activates focused stage rows (opens file)
- [ ] CHK011 Enter key activates focused artifact rows (opens file)
- [ ] CHK012 Space key activates focused feature cards
- [ ] CHK013 Space key activates focused artifact rows
- [ ] CHK014 Escape key clears search input when focused
- [ ] CHK015 Tab order follows visual layout: project selector → search → features → progress → workflow

## ARIA Attributes

- [ ] CHK016 Search input has `aria-label="Search features"` or associated `<label>`
- [ ] CHK017 Project select has `aria-label="Select project"` or associated `<label>`
- [ ] CHK018 "+ New" button has `aria-label="Start a new feature"`
- [ ] CHK019 Feature cards have `role="button"` attribute
- [ ] CHK020 Stage content divs have `role="button"` attribute
- [ ] CHK021 Artifact rows (non-missing) have `role="button"` attribute
- [ ] CHK022 Missing artifact rows have `aria-disabled="true"`
- [ ] CHK023 Progress ring SVGs have `aria-hidden="true"` (decorative)
- [ ] CHK024 Progress ring parent containers have `aria-label` (e.g. "Stages: 3 of 8 complete")
- [ ] CHK025 Stage badges ("DONE", "WIP") have `aria-label` or are announced as part of parent label
- [ ] CHK026 Feature count label is live-announced on search filter (`aria-live="polite"`)
- [ ] CHK027 "No matching features" message has `role="status"` or `aria-live="polite"`

## Focus Indicators

- [ ] CHK028 Visible `:focus-visible` outline on feature cards (not just color change)
- [ ] CHK029 Visible `:focus-visible` outline on stage rows
- [ ] CHK030 Visible `:focus-visible` outline on artifact rows
- [ ] CHK031 Visible `:focus-visible` outline on search input (border color change is acceptable)
- [ ] CHK032 Visible `:focus-visible` outline on buttons (New Feature, Show More, Clear)
- [ ] CHK033 Focus indicator has sufficient contrast ratio (3:1 minimum against background)
- [ ] CHK034 `outline: none` is NOT used without a replacement focus style

## Screen Reader Compatibility

- [ ] CHK035 Feature card announces: feature number, feature name, and percentage
- [ ] CHK036 Stage row announces: stage name and status (e.g. "Plan — complete")
- [ ] CHK037 Artifact row announces: artifact name and progress (e.g. "tasks.md — 5 of 12")
- [ ] CHK038 Progress section announces all three metrics (stages, tasks, checks)
- [ ] CHK039 Project switcher announces current project name
- [ ] CHK040 Status changes (feature selected, project switched) are announced via `aria-live`

## Theme Compatibility

- [ ] CHK041 All text is legible in VS Code **Dark+** theme
- [ ] CHK042 All text is legible in VS Code **Light+** theme
- [ ] CHK043 All text is legible in VS Code **High Contrast Dark** theme
- [ ] CHK044 Stage dots (complete/in-progress/not-started) are visually distinguishable in all themes
- [ ] CHK045 Progress rings are visible against the background in all themes
- [ ] CHK046 Feature card active state (border + background) is visible in all themes
- [ ] CHK047 No hardcoded foreground colors that break in light theme (e.g. white text on white background)
- [ ] CHK048 No hardcoded background colors that break in dark theme

## Color Contrast

- [ ] CHK049 Text meets WCAG 2.1 AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] CHK050 Interactive elements meet 3:1 contrast ratio against adjacent colors
- [ ] CHK051 Stage status is not conveyed by color alone (badges provide text labels: "DONE", "WIP")
- [ ] CHK052 Progress is not conveyed by color alone (numeric values displayed alongside rings/bars)

## Notes

- VS Code WebViews do not inherit the editor's keyboard shortcuts; all keyboard handling must be implemented in the WebView's `<script>` block
- Test with the built-in VS Code screen reader support: `Cmd+Shift+P` → "Toggle Screen Reader Optimized Mode"
- The `aria-live` regions should use `polite` (not `assertive`) to avoid disrupting the user
- All items in this checklist correspond to tasks T057–T066 in tasks.md

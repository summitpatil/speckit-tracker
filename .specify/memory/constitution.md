# SpecKit Tracker Constitution

## Core Principles

### I. Extension-First

Every feature starts as a VS Code extension contribution — a command, view, configuration setting, or menu item registered in `package.json`. No functionality lives outside the extension API surface. Features that cannot be expressed as extension contributions are out of scope.

- All user-facing capabilities must be registered in `contributes` (commands, views, configuration, menus)
- Extension activates via `workspaceContains` events only; no eager activation
- Extension host is the single entry point; no background processes or external servers

### II. Theme-Aware UI

WebView UI must use only VS Code CSS custom properties (`var(--vscode-*)`) for colors, fonts, and spacing. No hardcoded color values are permitted in production CSS. The extension must render correctly across light, dark, and high-contrast themes without any user intervention.

- All foreground, background, border, and accent colors derive from `--vscode-*` variables
- Custom accent colors (e.g. stage status indicators) must use CSS custom properties defined in `:root` that map to theme-appropriate values
- Test every UI change in at least dark and light themes before merging

### III. Accessibility Required

All interactive elements in the WebView must be keyboard-navigable and screen-reader accessible. Clickable elements that are not native buttons or links must have `role="button"`, `tabindex="0"`, and `keydown` handlers for Enter/Space. Form controls must have associated `<label>` elements or `aria-label` attributes.

- No `<div>` with `cursor: pointer` without `role` and keyboard support
- SVG decorative elements use `aria-hidden="true"`; informational SVGs get `aria-label`
- Visible `:focus-visible` styles on all focusable elements

### IV. Zero-Config Activation

The extension activates automatically when a workspace contains `specs/` or `.specify/` directories. No manual setup, configuration, or initialization step is required from the user. Sensible defaults are provided for all settings.

- Activation events: `workspaceContains:.specify`, `workspaceContains:specs`
- All configuration settings have documented defaults
- The extension is fully functional without any `.specify/` directory (specs-only projects work)

### V. Simplicity

Minimal dependencies, no runtime npm packages. The extension uses only the VS Code Extension API and Node.js built-ins (`fs`, `path`, `child_process`). TypeScript is the only language. Build output is self-contained JavaScript in `out/`.

- Zero `dependencies` in `package.json` (only `devDependencies`)
- No bundler required; `tsc` compiles directly to `out/`
- Single WebView with inline HTML/CSS/JS; no framework (React, Svelte, etc.)
- Keep total VSIX size under 200 KB

## Development Standards

- TypeScript strict mode enabled
- All source files in `src/` following the layered structure: `models/`, `parsers/`, `providers/`
- No `any` types in new code; use explicit typing
- HTML escaping (`_esc()`) required for all user-derived content rendered in WebView
- File system operations wrapped in try/catch; never crash the extension host

## Governance

This constitution supersedes all ad-hoc decisions. Amendments require:

1. A documented rationale in the feature spec
2. A constitution check in the implementation plan showing the violation and justification
3. Update to this file with the change and date

Complexity must always be justified. If a simpler approach exists, use it.

**Version**: 1.0.0 | **Ratified**: 2026-03-09 | **Last Amended**: 2026-03-09

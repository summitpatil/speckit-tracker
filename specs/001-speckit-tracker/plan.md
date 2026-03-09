# Implementation Plan: SpecKit Tracker

**Branch**: `001-speckit-tracker` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-speckit-tracker/spec.md`

## Summary

Build a VS Code extension that provides a visual sidebar dashboard for tracking feature progress through the Spec-Driven Development lifecycle. The extension parses `specs/` directories, computes stage and task completion, renders an interactive WebView with progress rings and a workflow pipeline, and supports multi-project workspaces. Publishing to the VS Code Marketplace under `summitpatil/speckit-tracker`.

## Technical Context

**Language/Version**: TypeScript 5.3+
**Primary Dependencies**: VS Code Extension API (`@types/vscode ^1.85.0`), `@vscode/vsce ^3.0.0` (dev only)
**Storage**: File system only (reads `specs/` and `.specify/` directories; writes only during "New Feature" creation)
**Testing**: Manual test matrix (F5 Extension Development Host); ESLint for static analysis
**Target Platform**: VS Code 1.85+, Cursor, VSCodium (any editor supporting the VS Code Extension API)
**Project Type**: VS Code Extension (WebView-based sidebar panel)
**Performance Goals**: Activation < 500ms, project switch < 200ms, VSIX < 200 KB
**Constraints**: Zero runtime npm dependencies; TypeScript compiled with `tsc` to `out/`; no bundler
**Scale/Scope**: Supports workspaces with up to 500+ features via lazy loading and client-side search

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Extension-First | Pass | All features are registered as VS Code contributions: commands (`speckit.refresh`, `speckit.openFile`, `speckit.newFeature`), views (`speckit-panel`), menus, and configuration. No functionality outside the extension API. |
| II. Theme-Aware UI | Partial | WebView uses `var(--vscode-*)` for most colors. Three custom accent colors (`--accent`, `--success`, `--warn`) are hardcoded hex values. Remediation: refactor these to derive from theme variables or use conditionally safe values. |
| III. Accessibility Required | Fail | Current WebView uses `<div>` with `cursor: pointer` for interactive elements without `role`, `tabindex`, or keyboard handlers. Search input lacks `<label>`. Progress rings lack `aria-label`. Remediation planned in US6. |
| IV. Zero-Config Activation | Pass | Activation events: `workspaceContains:.specify`, `workspaceContains:specs`. All settings have defaults. Extension works without `.specify/` (specs-only projects). |
| V. Simplicity | Pass | Zero runtime dependencies. `tsc` compiles to `out/`. Single WebView with inline HTML/CSS/JS. VSIX at ~67 KB. |

## Project Structure

### Documentation (this feature)

```text
specs/001-speckit-tracker/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 design decisions
├── data-model.md        # TypeScript type system
├── quickstart.md        # Dev/build/test instructions
├── tasks.md             # Implementation task list
└── checklists/
    ├── requirements.md  # Spec quality validation
    ├── marketplace.md   # Publishing readiness
    └── accessibility.md # A11y compliance
```

### Source Code (repository root)

```text
speckit-vscode/
├── src/
│   ├── extension.ts                    # Entry point: activate/deactivate, command registration,
│   │                                   # project discovery, file watchers, status bar, newFeature
│   ├── models/
│   │   └── types.ts                    # All TypeScript interfaces and enums
│   ├── parsers/
│   │   └── specParser.ts               # File system parser: workspace → SpecKitState
│   └── providers/
│       └── SidebarWebviewProvider.ts   # WebView HTML/CSS/JS generation, message handling
├── resources/
│   └── icons/
│       ├── speckit.svg                 # Activity bar icon (monochrome, currentColor)
│       └── speckit-icon.png            # Marketplace gallery icon (128x128 PNG)
├── out/                                # Compiled JS output (gitignored contents)
├── specs/                              # Spec-Kit documentation (this project dogfoods itself)
├── .specify/                           # Spec-Kit configuration, templates, scripts
├── package.json                        # Extension manifest and metadata
├── tsconfig.json                       # TypeScript compiler config
├── .vscodeignore                       # VSIX packaging exclusions
├── .gitignore                          # Git exclusions
├── README.md                           # Marketplace-facing documentation
├── DEVELOPMENT.md                      # Internal engineering documentation
├── LICENSE                             # MIT license (to be created)
└── CHANGELOG.md                        # Version history (to be created)
```

**Structure Decision**: Single-project VS Code extension. All source lives under `src/` with a flat layered structure (models → parsers → providers → extension entry point). No monorepo, no frontend/backend split.

### Data Flow

```
Activation
  ├─ discoverProjectRoots()     → string[] of workspace folders with specs/ or .specify/
  ├─ new SpecParser(root)       → parses each root into SpecKitState
  │   ├─ parseWorkspace()       → scans specs/###-*/ directories
  │   ├─ parseFeature()         → reads files, computes stages
  │   ├─ parseStages()          → checks file existence, reads content, counts checkboxes
  │   └─ detectActiveFeature()  → matches .git/HEAD branch to feature dir
  ├─ MultiProjectState          → aggregates all ProjectInfo objects
  └─ SidebarWebviewProvider     → generates HTML from MultiProjectState
      ├─ _projectSwitcher()     → dropdown or static project display
      ├─ _progressSection()     → 3 SVG ring charts
      ├─ _featuresSection()     → search + feature cards + lazy loading
      └─ _workflowSection()     → vertical pipeline with stage rows + artifacts

User Interaction (WebView → Extension)
  ├─ selectProject   → re-render with new active project index
  ├─ selectFeature   → set active feature and re-render
  ├─ openFile        → vscode.window.showTextDocument()
  ├─ newFeature      → run create script or manual fallback
  └─ refresh         → re-parse all projects

File Watchers → debounced refresh() → re-render
```

### Key Integration Points

1. **VS Code Extension API**: `vscode.window.registerWebviewViewProvider`, `vscode.commands.registerCommand`, `vscode.workspace.createFileSystemWatcher`, `vscode.window.createStatusBarItem`
2. **Node.js `fs`**: Synchronous reads for parsing (acceptable because spec directories are small); `existsSync`, `readFileSync`, `readdirSync`, `mkdirSync`, `writeFileSync`, `copyFileSync`
3. **Node.js `child_process`**: `execFile` for running `create-new-feature.sh`
4. **Git**: Read-only access to `.git/HEAD` for branch detection

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Hardcoded accent colors (#e8843c, #4ec9b0, #e8c94c) | Stage status needs distinct visual encoding beyond what VS Code theme variables provide (no semantic "success"/"warning" variables exist for WebView) | Using only theme variables would make stages indistinguishable. Remediation: define CSS custom properties in `:root` that can be overridden, and test across themes. |
| Inline HTML/CSS/JS in WebView | VS Code WebView requires a single HTML document; external files would need `asWebviewUri()` for each asset | Using a framework (React/Svelte) adds build complexity, a bundler, and violates Constitution V (Simplicity). Inline keeps the extension self-contained. |

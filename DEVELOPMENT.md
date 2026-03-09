# SpecKit Tracker — Development Guide

Complete guide to how this extension was built, how it works internally, and how to extend it.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Data Flow](#4-data-flow)
5. [File-by-File Walkthrough](#5-file-by-file-walkthrough)
6. [How the WebView Works](#6-how-the-webview-works)
7. [How Spec Parsing Works](#7-how-spec-parsing-works)
8. [Extension Settings](#8-extension-settings)
9. [Accessibility](#9-accessibility)
10. [Development Setup](#10-development-setup)
11. [Build & Package](#11-build--package)
12. [Testing Locally](#12-testing-locally)
13. [Sharing with Engineers](#13-sharing-with-engineers)
14. [Publishing to Marketplace](#14-publishing-to-marketplace)
15. [CI/CD](#15-cicd)
16. [Adding New Features](#16-adding-new-features)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Project Overview

**Name**: SpecKit - Spec-Driven Development Tracker
**Publisher**: summitpatil
**Repository**: https://github.com/summitpatil/speckit-tracker

**What**: A VS Code / Cursor sidebar extension that visualizes the Spec-Kit workflow.

**Why**: The spec-kit workflow (`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`) generates markdown artifacts in `specs/` directories. This extension provides a visual dashboard to track progress across features and projects instead of manually browsing files.

**Inspired by**: The [specsmd extension](https://open-vsx.org/extension/fabriqaai/specsmd) and [GitHub spec-kit](https://github.com/github/spec-kit).

**Tech stack**:
- TypeScript (strict mode)
- VS Code Extension API (`vscode` module)
- WebView panel (HTML/CSS/JS rendered inside the sidebar)
- No external runtime dependencies (zero `dependencies` in package.json)

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    VS Code / Cursor                       │
│                                                           │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  extension.ts│───▶│  SpecParser  │───▶│  File System │ │
│  │  (activate)  │    │  (read-only) │    │  (specs/, .  │ │
│  │              │    └──────┬───────┘    │   specify/)  │ │
│  │              │           │            └──────────────┘ │
│  │              │    ┌──────▼───────┐                     │
│  │              │───▶│  Sidebar     │    ┌──────────────┐ │
│  │              │    │  WebView     │───▶│  User clicks │ │
│  │              │    │  Provider    │    │  → postMsg   │ │
│  │              │    └──────────────┘    │  → commands  │ │
│  │              │                        └──────────────┘ │
│  │              │    ┌──────────────┐                     │
│  │              │───▶│  File        │                     │
│  │              │    │  Watchers    │ (auto-refresh)      │
│  │              │    └──────────────┘                     │
│  │              │    ┌──────────────┐                     │
│  │              │───▶│  Status Bar  │                     │
│  └─────────────┘    └──────────────┘                     │
└──────────────────────────────────────────────────────────┘
```

**Key design decisions**:

| Decision | Choice | Why |
|----------|--------|-----|
| UI approach | WebView (not TreeView) | Full control over visual design — progress circles, pipeline, cards |
| State management | Re-parse on every refresh | Simple, no stale state bugs. Parsing is fast (<5ms for typical projects) |
| Multi-project | Scan all workspace folders | Multi-root workspace support is expected in enterprise setups |
| Dependencies | Zero runtime deps | Smaller VSIX, no supply chain risk, faster installs |
| Search/pagination | Client-side JS in WebView | All data is already in the HTML; no round-trips needed |

---

## 3. Project Structure

```
speckit-vscode/
├── package.json              # Extension manifest (activation, commands, views, settings)
├── tsconfig.json             # TypeScript config (strict, ES2022, commonjs)
├── .vscodeignore             # Files excluded from VSIX package
├── .gitignore                # Git ignores (out/, node_modules/, *.vsix)
├── README.md                 # User-facing documentation
├── DEVELOPMENT.md            # This file — internal engineering docs
├── LICENSE                   # MIT license
├── CHANGELOG.md              # Version history
│
├── .github/
│   └── workflows/
│       ├── ci.yml            # Lint + compile + package on push/PR
│       └── publish.yml       # Auto-publish on version tag
│
├── resources/
│   └── icons/
│       ├── speckit.svg       # Activity bar icon (monochrome SVG, uses currentColor)
│       └── speckit-icon.png  # Extension gallery icon (PNG)
│
├── src/
│   ├── extension.ts          # Entry point: activate(), commands, watchers, settings
│   │
│   ├── models/
│   │   └── types.ts          # All TypeScript interfaces and enums
│   │
│   ├── parsers/
│   │   └── specParser.ts     # Reads file system, builds SpecKitState
│   │
│   └── providers/
│       └── SidebarWebviewProvider.ts   # WebView HTML/CSS/JS generation
│
├── out/                      # Compiled JS (git-ignored, built by `tsc`)
└── node_modules/             # Dev dependencies only
```

---

## 4. Data Flow

### On Activation

```
activate()
  → discoverProjectRoots()        // scan workspace folders for specs/ or .specify/
  → register WebviewViewProvider   // sidebar panel
  → register commands              // speckit.refresh, speckit.openFile, speckit.newFeature
  → setupAllWatchers()             // file watchers on all project roots (if autoRefresh)
  → applyStatusBarVisibility()     // respect speckit.showStatusBar setting
  → listen for config changes      // dynamically apply setting changes
  → refresh()                      // initial parse + render
```

### On Refresh (manual or file-watcher triggered)

```
refresh()
  → for each project root:
      → new SpecParser(root).parseWorkspace()
        → scan specs/ for ###-feature directories
        → for each feature: parseStages()
          → check existence of spec.md, plan.md, tasks.md, etc.
          → parse [x]/[ ] checkboxes for progress
          → detect clarification section
          → scan checklists/ directory
        → detect active feature from .git/HEAD
      → return SpecKitState
  → build MultiProjectState
  → sidebarProvider.refreshMulti(multiState)
    → re-generate full HTML string
    → set webview.html (triggers DOM replace)
  → updateStatusBar()
```

### On User Click in WebView

```
User clicks feature card / artifact / project dropdown
  → WebView JS: document.addEventListener('click', ...)
  → postMessage({ type: 'selectFeature' | 'openFile' | 'selectProject', ... })
  → Extension receives in onDidReceiveMessage handler
  → Executes corresponding VS Code command or updates state
```

---

## 5. File-by-File Walkthrough

### `src/models/types.ts`

Defines all data structures. No logic. Key types:

| Type | Purpose |
|------|---------|
| `StageStatus` | Enum: not-started, in-progress, complete, skipped |
| `WorkflowStage` | Enum: constitution, specify, clarify, plan, tasks, checklist, analyze, implement |
| `StageInfo` | One workflow stage with status, file path, and nested artifacts |
| `ArtifactInfo` | One file (e.g., `plan.md`) with existence flag and optional progress |
| `ProgressInfo` | `{ total, completed, percentage }` |
| `FeatureInfo` | One `###-feature-name` directory with all its stages |
| `SpecKitState` | All features for one project root |
| `ProjectInfo` | One project (name + root path + SpecKitState) |
| `MultiProjectState` | All projects + which one is active |

### `src/parsers/specParser.ts`

Pure read-only file system scanner. One class: `SpecParser`.

Key methods:
- `parseWorkspace()` — entry point, scans `specs/` directory
- `parseFeature()` — builds `FeatureInfo` for one `###-feature/` directory
- `parseStages()` — checks existence of each artifact, determines stage status
- `parseTaskProgress()` — regex counts `- [x]` vs `- [ ]` in a markdown file
- `detectActiveFeature()` — reads `.git/HEAD` to find current branch, matches to feature
- `getSpecStatus()` — checks if spec.md still has template placeholders

### `src/extension.ts`

Extension lifecycle and command registration.

Key functions:
- `activate()` — main entry point called by VS Code
- `discoverProjectRoots()` — scans all workspace folders for `specs/` or `.specify/`
- `refresh()` — re-parses all projects and updates the WebView
- `openFile()` — opens a file or shows a picker for directories
- `newFeature()` — creates a new feature directory and spec file
- `setupAllWatchers()` — creates file watchers on all project roots
- `getConfig()` — reads extension settings from VS Code configuration
- `applyStatusBarVisibility()` — shows/hides the status bar based on setting
- `debounce()` — prevents rapid-fire refreshes

### `src/providers/SidebarWebviewProvider.ts`

The core visual component. Implements `WebviewViewProvider`.

Key sections:
- `resolveWebviewView()` — called once when the sidebar panel is first shown
- `_getHtml()` — generates the full HTML document (styles + body + script)
- `_projectSwitcher()` — renders the project dropdown or label
- `_featuresSection()` — renders search input + feature cards + show-more button
- `_featureCard()` — renders one feature card with ARIA attributes
- `_progressSection()` — renders three SVG ring charts with ARIA labels
- `_workflowSection()` — renders the vertical pipeline with dots and lines
- `_artifactRow()` — renders one artifact with mini progress bar and ARIA
- `_progressCircle()` — generates one SVG donut chart with stroke-dashoffset animation
- WebView `<script>` block — handles search filtering, lazy loading, click delegation, keyboard navigation

---

## 6. How the WebView Works

The sidebar uses a **WebviewView** (VS Code API) which renders an HTML document inside the sidebar panel.

### Communication Pattern

```
Extension (Node.js)  ←→  WebView (Browser sandbox)
```

- **Extension → WebView**: Set `webview.html` (full HTML replacement)
- **WebView → Extension**: `vscode.postMessage({ type, ... })`
- **Extension → WebView response**: Re-render the entire HTML (simple, no partial updates)

### Why Full HTML Replacement?

We chose to re-render the entire HTML on every state change rather than using incremental DOM updates. Reasons:
1. The HTML is small (~2-3KB) — no performance concern
2. No framework dependency (no React/Svelte/etc.)
3. State is always consistent — no stale DOM bugs
4. Simpler code to maintain

### Styling

All styles use VS Code CSS variables (`var(--vscode-*)`) so the extension automatically adapts to any theme (dark, light, high contrast). Custom accent colors are defined via CSS custom properties (`--accent`, `--success`, `--warn`) and can be overridden for theming.

### Search & Lazy Loading

All implemented in the WebView `<script>` block (client-side JS):
- All feature cards are rendered in HTML with `data-search` attributes
- JS controls `display: none` on cards based on search term
- `visibleCount` starts at `PAGE_SIZE` (from `speckit.pageSize` setting), incremented on "Show More" click
- During search, all matches are shown (pagination bypassed)

---

## 7. How Spec Parsing Works

The `SpecParser` determines stage status by checking file existence:

| Stage | How Status is Determined |
|-------|--------------------------|
| Constitution | `.specify/memory/constitution.md` exists? |
| Specify | `spec.md` exists? Still has `[FEATURE NAME]` placeholder? |
| Clarify | `spec.md` contains `## Clarifications` heading? |
| Plan | `plan.md` exists? + `research.md`, `data-model.md`, `quickstart.md`, `contracts/` |
| Tasks | `tasks.md` exists? Parse `[x]`/`[ ]` for progress |
| Checklist | `checklists/` directory has `.md` files? Parse each for progress |
| Analyze | Always "not started" (it's a read-only report, no file artifact) |
| Implement | Task progress > 0? All tasks complete? |

### Progress Parsing

The regex `- \[x\]` (case-insensitive) counts completed items. The regex `- \[ \]` counts pending items. Total = completed + pending. This works on `tasks.md` and all checklist files.

---

## 8. Extension Settings

Three user-configurable settings, all applied immediately without reload:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `speckit.pageSize` | number | 10 | Features to show before "Show More" |
| `speckit.autoRefresh` | boolean | true | Auto-refresh on file changes |
| `speckit.showStatusBar` | boolean | true | Show status bar item |

Settings changes are handled via `vscode.workspace.onDidChangeConfiguration`.

---

## 9. Accessibility

The WebView is designed for keyboard and screen reader accessibility:

- All interactive elements have `role="button"` and `tabindex="0"`
- Enter/Space keydown handler activates focused buttons
- `aria-label` on feature cards, stage content, artifact rows, progress rings
- `aria-hidden="true"` on decorative SVGs
- `aria-live="polite"` on search result count and "no match" messages
- `:focus-visible` CSS styles for clear focus indication
- All colors derive from `var(--vscode-*)` variables where possible

---

## 10. Development Setup

### Prerequisites

- Node.js >= 18
- npm
- VS Code or Cursor

### First-Time Setup

```bash
cd speckit-vscode
npm install
```

### Development Workflow

```bash
# Terminal 1: Watch mode (auto-recompile on save)
npm run watch

# Terminal 2: Or manual compile
npm run compile
```

Then press `F5` in VS Code/Cursor to launch the Extension Development Host.

### Useful Commands

| Command | What it does |
|---------|--------------|
| `npm run compile` | One-time TypeScript compilation |
| `npm run watch` | Watch mode — recompiles on file changes |
| `npm run package` | Build the `.vsix` file |

---

## 11. Build & Package

```bash
npm run package
```

This runs `tsc` then `vsce package`. Output: `speckit-tracker-1.0.0.vsix`

### Version Bumping

Edit `version` in `package.json` before packaging a new release:

```json
"version": "1.0.0"
```

---

## 12. Testing Locally

### Method 1: F5 (Extension Development Host)

1. Open `speckit-vscode/` in VS Code/Cursor
2. Press `F5`
3. A new editor window opens with the extension active
4. Open a workspace that has `specs/` in it

### Method 2: Install VSIX

```bash
npm run package
cursor --install-extension speckit-tracker-1.0.0.vsix
```

Then reload: `Cmd+Shift+P` → "Developer: Reload Window"

### What to Test

| Test Case | Expected Behavior |
|-----------|-------------------|
| Open workspace with `specs/` | SpecKit icon appears in activity bar |
| Open workspace without `specs/` | No icon, no errors |
| Click a feature card | Workflow section updates, card gets orange highlight |
| Click an existing artifact | File opens in editor |
| Click a missing artifact | Nothing happens (no error) |
| Edit `tasks.md` (check off an item) | Progress circles update automatically |
| Switch git branches | Active feature updates |
| Search for a feature | List filters instantly |
| Click "Show More" | Next batch of features appears |
| Switch projects (dropdown) | Features list changes to new project |
| Tab through UI elements | Focus outlines are visible |
| Press Enter/Space on focused element | Same as clicking |
| Change `speckit.pageSize` to 5 | Only 5 features show initially |
| Set `speckit.autoRefresh` to false | File changes no longer auto-refresh |
| Set `speckit.showStatusBar` to false | Status bar item disappears |

---

## 13. Sharing with Engineers

### Option A: Share the VSIX File (Simplest)

1. Build: `npm run package`
2. Share `speckit-tracker-1.0.0.vsix` via Slack / Teams / shared drive / email
3. Teammates install:

```bash
cursor --install-extension speckit-tracker-1.0.0.vsix
```

4. Reload: `Cmd+Shift+P` → "Developer: Reload Window"

### Option B: Share via Git Repository

1. Push the `speckit-vscode` directory to a Git repo
2. Teammates clone and build:

```bash
git clone https://github.com/summitpatil/speckit-tracker.git
cd speckit-tracker
npm install
npm run package
cursor --install-extension speckit-tracker-*.vsix
```

### Option C: GitHub Releases

1. Push to GitHub
2. Create a release, attach the `.vsix` as a release asset
3. Teammates download and install

---

## 14. Publishing to Marketplace

### VS Code Marketplace

1. Create a publisher account at https://marketplace.visualstudio.com/manage (publisher: `summitpatil`)
2. Get a Personal Access Token (PAT) from Azure DevOps
3. Store the PAT as a GitHub secret (`VSCE_PAT`) for CI/CD auto-publishing
4. Manual publish:

```bash
npx @vscode/vsce publish -p <PAT>
```

Or push a version tag to trigger automatic publishing:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Open VSX Registry (for Cursor, Windsurf, etc.)

```bash
npx ovsx publish speckit-tracker-1.0.0.vsix -p <token>
```

---

## 15. CI/CD

### `.github/workflows/ci.yml`

Runs on every push to `main` and on pull requests:
- Checkout → Node.js setup → `npm ci` → `npm run compile` → `vsce package`
- Uploads the VSIX as a build artifact

### `.github/workflows/publish.yml`

Runs when a version tag (`v*`) is pushed:
- Compiles and publishes to the VS Code Marketplace using `VSCE_PAT` secret

---

## 16. Adding New Features

### Adding a New Workflow Stage

1. Add the stage to `WorkflowStage` enum in `types.ts`
2. Add parsing logic in `specParser.ts` → `parseStages()`
3. Add an icon in `SidebarWebviewProvider.ts` → `_stageIcon()`

### Adding a New Setting

1. Add to `contributes.configuration.properties` in `package.json`
2. Read via `getConfig<T>('settingName')` in `extension.ts`
3. Handle changes in `onDidChangeConfiguration`

### Adding a New Command

1. Add to `commands` array in `package.json`
2. Register in `activate()` in `extension.ts`
3. Optionally add to `menus` in `package.json`

### Modifying the WebView UI

Edit `SidebarWebviewProvider.ts`:
- CSS goes in the `<style>` block inside `_getHtml()`
- HTML structure is built by the `_*Section()` and `_*Card()` methods
- Client-side JS goes in the `<script>` block
- New message types need a handler in `resolveWebviewView()` → `onDidReceiveMessage`

---

## 17. Troubleshooting

### Extension doesn't activate

- Check that the workspace has a `specs/` or `.specify/` directory at the root of at least one folder
- Check `activationEvents` in `package.json`

### Sidebar is empty

- Click the SpecKit icon in the activity bar
- Run `Cmd+Shift+P` → "Spec-Kit: Refresh"
- Check Developer Tools console for errors

### Changes not reflected after edit

- File watchers should auto-refresh within 500ms (if `speckit.autoRefresh` is true)
- If not, run "Spec-Kit: Refresh" manually
- Check that the file is inside `specs/` (watchers only watch that directory)

### VSIX build fails

- Run `npm run compile` first to check for TypeScript errors
- Ensure `@vscode/vsce` is installed: `npm install`

### Extension crashes

- Open: `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
- Check the Console tab for stack traces
- Common issue: file path doesn't exist but code tries to read it

---

## Appendix: Key VS Code Extension APIs Used

| API | Where Used | Purpose |
|-----|-----------|---------|
| `vscode.window.registerWebviewViewProvider` | extension.ts | Register the sidebar panel |
| `WebviewView.webview.html` | SidebarWebviewProvider.ts | Set the HTML content |
| `WebviewView.webview.onDidReceiveMessage` | SidebarWebviewProvider.ts | Handle clicks from WebView |
| `vscode.workspace.createFileSystemWatcher` | extension.ts | Watch for file changes |
| `vscode.window.createStatusBarItem` | extension.ts | Status bar integration |
| `vscode.window.showTextDocument` | extension.ts | Open files in editor |
| `vscode.window.showQuickPick` | extension.ts | File picker for directories |
| `vscode.commands.registerCommand` | extension.ts | Register SpecKit commands |
| `vscode.workspace.getConfiguration` | extension.ts | Read extension settings |
| `vscode.workspace.onDidChangeConfiguration` | extension.ts | React to setting changes |

---

*Last updated: 2026-03-09 — v1.0.0*

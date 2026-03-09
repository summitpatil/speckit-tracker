# Quickstart: SpecKit Tracker

**Branch**: `001-speckit-tracker` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)

## Prerequisites

- **Node.js**: >= 20.0 (verify: `node --version`)
- **npm**: >= 10.0 (verify: `npm --version`)
- **VS Code** or **Cursor**: Any recent version (extension requires VS Code API ^1.85.0)
- **Git**: For branch detection features (optional but recommended)

## Setup

```bash
# Clone or navigate to the project
cd /path/to/speckit-vscode

# Install dependencies
npm install
```

This installs dev-only dependencies: `@types/vscode`, `@types/node`, `typescript`, `@vscode/vsce`.

## Development (F5 Launch)

1. Open the `speckit-vscode` folder in VS Code or Cursor
2. Press `F5` to launch the **Extension Development Host**
3. In the new window, open a workspace that contains `specs/` or `.specify/` directories
4. The seedling icon appears in the activity bar — click it to open the sidebar

**Hot reload workflow**:
- Edit TypeScript files in `src/`
- The `watch` task recompiles automatically: `npm run watch`
- In the Extension Development Host, run `Developer: Reload Window` (`Cmd+Shift+P`) to pick up changes

## Build

```bash
# Compile TypeScript to JavaScript
npm run compile

# Output goes to out/ directory:
# out/extension.js
# out/models/types.js
# out/parsers/specParser.js
# out/providers/SidebarWebviewProvider.js
# out/providers/FeatureTreeProvider.js      (legacy, to be removed)
# out/providers/WorkflowTreeProvider.js     (legacy, to be removed)
```

## Package

```bash
# Create the VSIX package
npm run package

# This runs: npx @vscode/vsce package --no-dependencies --allow-missing-repository
# Output: speckit-sidebar-X.Y.Z.vsix in the project root
```

Verify the package contents:

```bash
# The VSIX is a ZIP file — inspect its contents
unzip -l speckit-sidebar-*.vsix
```

Expected contents:
- `extension/out/**/*.js` — compiled JavaScript
- `extension/resources/icons/` — SVG and PNG icons
- `extension/package.json` — extension manifest
- `extension/README.md` — marketplace description
- `extension/CHANGELOG.md` — version history (when created)
- `extension/LICENSE` — MIT license (when created)

Should NOT contain: `src/`, `node_modules/`, `*.ts`, `*.map`, `DEVELOPMENT.md`

## Install Locally

```bash
# Install in Cursor
cursor --install-extension speckit-sidebar-0.3.0.vsix

# Install in VS Code
code --install-extension speckit-sidebar-0.3.0.vsix

# Reload the editor
# Cmd+Shift+P → "Developer: Reload Window"
```

Or via the UI: **Extensions** sidebar → **...** menu → **Install from VSIX...**

## Uninstall

```bash
# Current publisher.name ID:
cursor --uninstall-extension entrata-engineering.speckit-sidebar

# After rename to speckit-tracker:
cursor --uninstall-extension summitpatil.speckit-tracker
```

## Lint

```bash
# Run ESLint (requires .eslintrc.json config)
npm run lint
```

Note: ESLint config is not yet created. This is tracked as task T085.

## Test

There are no automated tests yet. Testing is manual:

### Manual Test Matrix

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **Activation** | Open workspace with `specs/` | Seedling icon appears in activity bar |
| **Empty state** | Open workspace without `specs/` | Warning message shown; no sidebar |
| **Dashboard rendering** | Click sidebar icon | Progress rings, features, pipeline visible |
| **Feature selection** | Click a feature card | Dashboard updates; card highlights orange |
| **Artifact click** | Click `plan.md` artifact row | File opens in editor |
| **Missing artifact** | See a dimmed artifact row | Click does nothing; no error |
| **Search** | Type in search input | Features filter instantly |
| **Lazy loading** | Have 15+ features | "Show More" button appears after 10 |
| **Multi-project** | Open multi-root workspace | Project dropdown shows qualifying folders |
| **Project switch** | Select different project | Features and progress update |
| **Git detection** | Check out `###-feature` branch | That feature auto-selects |
| **Auto-refresh** | Edit `tasks.md` (add `[x]`) | Progress rings update within 1 second |
| **New Feature** | Click "+ New", enter description | Directory created, spec.md opens |
| **Status bar** | Look at bottom of editor | Shows `project / feature %` |

### Theme Testing

Test the sidebar in these three themes:
1. **Dark+** (default dark)
2. **Light+** (default light)
3. **High Contrast Dark**

Verify: text is readable, stage dots are distinguishable, progress rings are visible, borders are appropriate.

## Project Commands

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile TypeScript once |
| `npm run watch` | Compile TypeScript in watch mode |
| `npm run lint` | Run ESLint |
| `npm run package` | Build VSIX package |

## VS Code Commands (Command Palette)

| Command | Description |
|---------|-------------|
| `Spec-Kit: Refresh` | Re-scan all projects and update sidebar |
| `Spec-Kit: New Feature` | Create a new feature with spec file |
| `Spec-Kit: Open File` | Open a spec artifact (used internally by sidebar clicks) |

## Directory Structure

```text
speckit-vscode/
├── src/                    # TypeScript source
│   ├── extension.ts        # Entry point
│   ├── models/types.ts     # Interfaces and enums
│   ├── parsers/specParser.ts       # File system parser
│   └── providers/
│       └── SidebarWebviewProvider.ts  # WebView HTML generation
├── out/                    # Compiled JS (gitignored contents)
├── resources/icons/        # SVG + PNG icons
├── specs/                  # Spec-Kit documentation
├── .specify/               # Spec-Kit config, templates, scripts
├── package.json            # Extension manifest
├── tsconfig.json           # TypeScript config
├── README.md               # Marketplace docs
├── DEVELOPMENT.md          # Engineering docs
└── *.vsix                  # Built packages (gitignored)
```

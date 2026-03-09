# SpecKit - Spec-Driven Development Tracker

Visual sidebar extension for **Spec-Driven Development** in VS Code, Cursor, and compatible editors.

Track feature specifications, implementation plans, tasks, and checklists across multiple projects — all from a dedicated activity bar panel.

## Features

### Multi-Project Support
- Automatically discovers all workspace folders containing `specs/` or `.specify/`
- Project selector dropdown to switch between repos
- Each project maintains its own feature list and active feature selection

### Feature Search & Lazy Loading
- Search input to filter features by number, name, or branch name
- Configurable page size (default 10) with a "Show More" button
- Instant client-side filtering as you type

### Progress Dashboard
- Three SVG ring charts showing completion for **Stages**, **Tasks**, and **Checks**
- Real-time parsing of `- [x]` / `- [ ]` checkboxes in tasks.md and checklists

### Workflow Pipeline
8 stages visualized as a vertical timeline with color-coded dots:

| Stage | Command | Key Artifacts |
|-------|---------|---------------|
| Constitution | `/speckit.constitution` | `.specify/memory/constitution.md` |
| Specify | `/speckit.specify` | `specs/###-feature/spec.md` |
| Clarify | `/speckit.clarify` | `## Clarifications` section in spec.md |
| Plan | `/speckit.plan` | `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/` |
| Tasks | `/speckit.tasks` | `tasks.md` |
| Checklist | `/speckit.checklist` | `checklists/*.md` |
| Analyze | `/speckit.analyze` | Report only (read-only) |
| Implement | `/speckit.implement` | Code + task completion tracking |

### Additional
- **Click-to-Open** — Click any artifact to open it in the editor
- **Auto-Refresh** — File system watchers detect changes automatically (configurable)
- **Git Branch Detection** — Selects the active feature from current git branch
- **Status Bar** — Shows `project / feature percentage` at bottom of editor (configurable)
- **Keyboard Accessible** — Full keyboard navigation with ARIA labels

---

## Installation

### Option 1: VS Code Marketplace

Search for **"SpecKit"** in the Extensions sidebar, or install from the command line:

```bash
code --install-extension summitpatil.speckit-tracker
```

### Option 2: Install from VSIX

```bash
# Install in Cursor
cursor --install-extension speckit-tracker-1.0.0.vsix

# Install in VS Code
code --install-extension speckit-tracker-1.0.0.vsix
```

Or via the UI: **Extensions** sidebar → **...** menu → **Install from VSIX...**

### Option 3: Build from Source

```bash
git clone https://github.com/summitpatil/speckit-tracker.git
cd speckit-tracker
npm install
npm run compile
npm run package
```

---

## Requirements

- VS Code 1.85+ or Cursor (any recent version)
- A workspace with `.specify/` and/or `specs/` directories

No additional configuration needed. The extension activates automatically.

---

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `speckit.pageSize` | number | 10 | Features to show before "Show More" |
| `speckit.autoRefresh` | boolean | true | Auto-refresh on file changes |
| `speckit.showStatusBar` | boolean | true | Show status bar item |

---

## Commands

| Command | Description |
|---------|-------------|
| `Spec-Kit: Refresh` | Manually re-scan all projects |
| `Spec-Kit: New Feature` | Create a new feature with spec file |
| `Spec-Kit: Open File` | Open a spec artifact |

---

## How to Share with Your Team

### Quick Share

1. Download the `.vsix` file from the [Releases](https://github.com/summitpatil/speckit-tracker/releases) page
2. Send it to teammates via Slack / Teams / email
3. Install: `cursor --install-extension speckit-tracker-1.0.0.vsix`
4. Reload: `Cmd+Shift+P` → "Developer: Reload Window"

### Uninstalling

```bash
cursor --uninstall-extension summitpatil.speckit-tracker
```

---

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

### 1.0.0
- Extension settings (page size, auto-refresh, status bar)
- Full keyboard accessibility and ARIA support
- Marketplace publishing with LICENSE and CHANGELOG
- Removed legacy TreeView providers

### 0.3.0
- New Feature creation from sidebar

### 0.2.1
- Multi-project support, feature search, lazy loading

### 0.2.0
- Rich WebView sidebar with SVG progress rings and workflow pipeline

### 0.1.0
- Initial release with TreeView-based sidebar

---

## License

[MIT](LICENSE)

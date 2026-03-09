# Research: SpecKit Tracker — Phase 0 Decisions

**Branch**: `001-speckit-tracker` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)

## Decision 1: WebView vs. TreeView for Sidebar UI

### Context

VS Code offers two primary approaches for sidebar content: native TreeViews (using `TreeDataProvider`) and custom WebViews (using `WebviewViewProvider`). The extension needs to display progress rings, a color-coded pipeline, feature cards with search, and interactive artifact rows.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. TreeView** | Native look-and-feel; built-in keyboard navigation and accessibility; simpler code; automatic theme support | Cannot render SVG progress rings; limited to text, icons, and basic formatting; no custom layouts; pipeline visualization impossible |
| **B. WebView** | Full HTML/CSS/JS control; SVG rings, custom pipelines, search inputs; rich interactive UI | Must implement accessibility manually; theme integration via CSS variables; more complex code; HTML escaping required |
| **C. Hybrid (TreeView + WebView)** | Native feel for lists, rich rendering for dashboard | Two rendering systems to maintain; complex state synchronization; confusing navigation |

### Decision

**Option B: WebView** — The core value proposition is a visual dashboard. TreeViews cannot render the SVG progress rings, the vertical pipeline with colored dots, or the search/lazy-loading feature list. A full WebView gives complete control over the UI.

### Consequences

- Must implement keyboard accessibility (ARIA, tabindex, keydown handlers) manually
- Must use `var(--vscode-*)` CSS variables for theme compatibility
- Must escape all user-derived content with `_esc()` to prevent XSS
- WebView HTML is regenerated on each state change (full replacement, not incremental DOM updates)

### Alternatives Rejected

- **TreeView with description decorations**: Investigated using `TreeItem.description` and `TreeItem.iconPath` for progress indicators. Result: too limited — cannot show percentage rings or multi-line layouts. Abandoned after v0.1.0 prototype.
- **Webview UI Toolkit**: Microsoft's `@vscode/webview-ui-toolkit` provides web components. Rejected because it adds a runtime dependency (violates Constitution V) and the custom CSS approach is sufficient.

---

## Decision 2: Progress Visualization — SVG Rings vs. Text

### Context

The dashboard needs to show completion progress for Stages (X/8), Tasks (X/Y), and Checks (X/Y). The visualization should be immediately glanceable.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Text only** ("3/8 stages") | Simplest; accessible by default | Not visual; requires reading numbers; doesn't convey proportion |
| **B. SVG donut rings** | Immediate visual proportion; compact; professional look | More code; must handle 0% and 100% edge cases; needs aria-label for accessibility |
| **C. CSS-only progress bars** | Simple implementation; native feeling | Takes more horizontal space; less compact than rings; less visually distinctive |

### Decision

**Option B: SVG donut rings** — Three compact ring charts side by side provide instant visual feedback. The numeric value is centered inside the ring for exact counts. The `stroke-dashoffset` technique animates smoothly on state changes.

### Implementation

- Ring radius: 22px, stroke-width: 4px, viewBox: 56x56
- Colors: `--accent` (orange) for Stages, `--success` (green) for Tasks, `--warn` (yellow) for Checks
- `stroke-dasharray` = circumference = `2 * PI * 22 ≈ 138.23`
- `stroke-dashoffset` = `circumference * (1 - percentage)`
- Accessibility: `aria-hidden="true"` on SVG, `aria-label` on parent container

---

## Decision 3: Client-Side Search vs. Message-Passing Search

### Context

The features list can contain many items (50+ in large projects). Users need to filter features quickly by number, name, or branch name.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Client-side JS filtering** | Instant response; no round-trips to extension host; simple DOM manipulation | All feature cards rendered in HTML (hidden by CSS); larger initial HTML payload |
| **B. Message-passing search** | Only matching cards rendered; smaller DOM | Round-trip latency on each keystroke; requires debouncing; complex state sync |
| **C. Virtual scrolling** | Minimal DOM regardless of list size | Complex implementation; overkill for <500 items; poor accessibility |

### Decision

**Option A: Client-side JS filtering** — All feature cards are rendered with `data-search` attributes. JavaScript in the WebView filters by showing/hiding cards based on the search term. Combined with lazy loading (10 at a time), the initial DOM is small. Search is instant with no extension host round-trips.

### Implementation

- Each card: `<div class="feature-card" data-search="002 api migration utilities 002-api-migration-utilities">`
- Filter function: `card.dataset.search.toLowerCase().includes(searchTerm.toLowerCase())`
- When search is active, all matching cards are shown (bypass lazy loading)
- When search is cleared, lazy loading limit is restored

---

## Decision 4: Script Execution for New Feature

### Context

The "New Feature" command needs to create a branch and spec directory. The Spec-Kit project provides `create-new-feature.sh` for this, but the script may not exist in all projects.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. `child_process.execFile`** | Direct execution; JSON output parsing; runs silently | Requires bash; no terminal UI for user; error handling via stderr |
| **B. VS Code Terminal** | User sees output; familiar terminal interaction | Cannot parse structured output; user must interact with terminal; harder to auto-open spec.md |
| **C. VS Code Task** | Structured; can capture output | Complex setup; overkill for a single script call |

### Decision

**Option A: `child_process.execFile`** — The script is called with `--json` flag and outputs structured JSON with `BRANCH_NAME` and `SPEC_FILE`. The extension parses this to show a success message, refresh the sidebar, and open the new `spec.md`. If the script doesn't exist, a manual fallback creates the directory and file using Node.js `fs`.

### Fallback Logic

1. Check if `.specify/scripts/bash/create-new-feature.sh` exists
2. If yes: `execFile('bash', [scriptPath, '--json', description], { cwd })`
3. If no: manually compute next `###`, create `specs/###-slug/`, copy spec template, open file

---

## Decision 5: Extension Naming and Publishing

### Context

The extension needs a marketplace identity: name, display name, publisher, and GitHub repository.

### Options Considered

| Option | Display Name | npm name | Publisher |
|--------|-------------|----------|-----------|
| A | Sprout - Feature Lifecycle Dashboard | `sprout` | `summitpatil` |
| B | SpecKit - Spec-Driven Development Tracker | `speckit-tracker` | `summitpatil` |
| C | Seedling - Spec-Kit Workflow Dashboard | `seedling` | `summitpatil` |

### Decision

**Option B: SpecKit - Spec-Driven Development Tracker** — Follows the descriptive naming pattern (like "specsmd - Memory Bank Extension - Spec Driven Development"). The name immediately communicates: brand (SpecKit), purpose (Tracker), and domain (Spec-Driven Development). The npm name `speckit-tracker` is unique and searchable.

### Publishing Details

- **Publisher**: `summitpatil` (GitHub: [summitpatil](https://github.com/summitpatil))
- **Repository**: `github.com/summitpatil/speckit-tracker`
- **Marketplace ID**: `summitpatil.speckit-tracker`
- **Icon**: Colorful seedling/sprout on gradient background (128x128 PNG)
- **Activity bar icon**: Monochrome seedling SVG with `fill="currentColor"`

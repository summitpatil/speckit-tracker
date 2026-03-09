# Feature Specification: SpecKit Tracker — VS Code Extension for Spec-Driven Development

**Feature Branch**: `001-speckit-tracker`
**Created**: 2026-03-09
**Status**: In Progress
**Input**: User description: "Build a VS Code extension that provides a visual sidebar dashboard for tracking feature progress through the Spec-Driven Development lifecycle. Support multi-project workspaces, feature search, lazy loading, new feature creation, and publish to the VS Code Marketplace under the summitpatil publisher."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visual Development Dashboard (Priority: P1)

A developer opens a workspace that contains a `specs/` directory with one or more feature directories (e.g. `specs/002-api-migration-utilities/`). The extension activates automatically and shows a sidebar panel in the activity bar. The panel displays three SVG ring charts (Stages completed, Tasks completed, Checks completed) for the active feature, a vertical workflow pipeline showing the 8 Spec-Kit stages (Constitution, Specify, Clarify, Plan, Tasks, Checklist, Analyze, Implement) with color-coded status dots, and clickable artifact rows that open the corresponding files in the editor.

**Why this priority**: The dashboard is the core value proposition — without it the extension has no purpose.

**Independent Test**: Open any workspace with `specs/###-feature/` directories. The sidebar should render progress rings, a workflow pipeline with correct stage statuses, and clicking an artifact should open the file.

**Acceptance Scenarios**:

1. **Given** a workspace with `specs/002-api-migration/` containing `spec.md`, `plan.md`, and `tasks.md`, **When** the extension activates, **Then** the sidebar shows 3 progress rings with computed values, the pipeline shows Specify/Plan/Tasks as complete or in-progress, and clicking `plan.md` opens it in the editor.
2. **Given** a feature with `tasks.md` containing 5 of 12 tasks checked, **When** viewing the dashboard, **Then** the Tasks ring shows 5 with "of 12" and the mini progress bar on the artifact row reflects 42%.
3. **Given** no active feature (no git branch match), **When** the dashboard loads, **Then** it defaults to the most recent feature (highest number) and shows its progress.

---

### User Story 2 — Multi-Project Workspace Support (Priority: P1)

A developer works in a multi-root VS Code workspace with several repositories (e.g. Entrata, utilities, utility-lite-react). Each may or may not have `specs/` or `.specify/` directories. The extension discovers all qualifying projects and shows a project selector dropdown at the top of the sidebar. Switching projects refreshes the dashboard to show that project's features and progress.

**Why this priority**: Most developers work across multiple repos; without multi-project support the extension is unusable in real workflows.

**Independent Test**: Open a multi-root workspace where at least two folders contain `specs/`. The project dropdown should list both, switching between them should show different feature lists.

**Acceptance Scenarios**:

1. **Given** a workspace with 3 folders where 2 have `specs/`, **When** the extension activates, **Then** the project dropdown lists those 2 projects with feature counts.
2. **Given** the user switches from Project A to Project B via the dropdown, **When** the selection changes, **Then** the features list, progress rings, and workflow pipeline update to reflect Project B's state.
3. **Given** a workspace with only 1 qualifying project, **When** the extension activates, **Then** no dropdown is shown; the project name and path are displayed as static text.

---

### User Story 3 — Feature Lifecycle Tracking (Priority: P1)

The extension parses each `specs/###-feature-name/` directory to determine which Spec-Kit stages have been completed. It checks for the existence of specific files (`spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`, `checklists/`), reads content to detect placeholders vs. real content, and parses checkbox progress (`- [x]` / `- [ ]`) in tasks and checklists. It detects the active feature by matching the current git branch to a feature directory name.

**Why this priority**: Accurate parsing is the foundation of all dashboard data; incorrect parsing renders the extension useless.

**Independent Test**: Create a `specs/` directory with known file states. Verify each stage reports the correct status (not-started, in-progress, complete).

**Acceptance Scenarios**:

1. **Given** `spec.md` exists but contains `[FEATURE NAME]` placeholder, **When** parsed, **Then** the Specify stage shows "in-progress".
2. **Given** `spec.md` exists with real content (no placeholders), **When** parsed, **Then** the Specify stage shows "complete".
3. **Given** the current git branch is `002-api-migration-utilities`, **When** parsed, **Then** that feature is selected as active.
4. **Given** `checklists/requirements.md` has 3 of 5 items checked, **When** parsed, **Then** the Checklist stage shows "in-progress" and the artifact row shows "3/5".
5. **Given** a feature directory with no `plan.md`, **When** parsed, **Then** the Plan stage shows "not-started" and the `plan.md` artifact row is dimmed and non-clickable.

---

### User Story 4 — Feature Creation (Priority: P2)

A developer clicks the "+ New" button in the sidebar or runs the "Spec-Kit: New Feature" command from the command palette. The extension prompts for a feature description. If `.specify/scripts/bash/create-new-feature.sh` exists in the project, it runs the script (which creates the branch and spec directory). Otherwise, it falls back to manual creation: computes the next `###` number, creates the `specs/###-slug/` directory, copies the spec template, and opens `spec.md`.

**Why this priority**: Starting a new feature is a frequent action but the dashboard (P1) must work first.

**Independent Test**: Click "+ New", enter "Add user authentication". Verify a new directory is created, `spec.md` is opened, and the sidebar refreshes to show the new feature.

**Acceptance Scenarios**:

1. **Given** a project with `.specify/scripts/bash/create-new-feature.sh`, **When** the user creates a new feature with description "Add caching", **Then** the script runs, a branch is created, `spec.md` is opened, and the sidebar refreshes.
2. **Given** a project without the create script, **When** the user creates a new feature, **Then** the extension manually creates `specs/###-slug/spec.md` using the template, opens it, and refreshes.
3. **Given** existing features `001-*` and `002-*`, **When** a new feature is created, **Then** it gets number `003`.
4. **Given** the user cancels the description input, **When** the input box is dismissed, **Then** nothing is created and no error is shown.

---

### User Story 5 — Extension Settings (Priority: P2)

A developer wants to customize the extension behavior. The extension provides VS Code settings:
- `speckit.pageSize` (number, default 10): How many features to show before "Show More"
- `speckit.autoRefresh` (boolean, default true): Whether file watchers trigger automatic refresh
- `speckit.showStatusBar` (boolean, default true): Whether the status bar item is visible

**Why this priority**: Settings improve usability but the extension works fine with defaults.

**Independent Test**: Change `speckit.pageSize` to 5 in settings. Verify only 5 features show initially with "Show More" appearing for the rest.

**Acceptance Scenarios**:

1. **Given** `speckit.pageSize` is set to 5 and a project has 12 features, **When** the sidebar loads, **Then** 5 features are visible and "Show More" indicates 7 remaining.
2. **Given** `speckit.autoRefresh` is set to false, **When** a file in `specs/` changes, **Then** the sidebar does not auto-refresh; the user must click the refresh button.
3. **Given** `speckit.showStatusBar` is set to false, **When** the extension activates, **Then** no status bar item is shown.

---

### User Story 6 — Accessibility and Theming (Priority: P2)

A developer uses a high-contrast theme or navigates entirely by keyboard. All interactive elements in the WebView (feature cards, stage rows, artifact rows, buttons, search input, project select) are keyboard-accessible with visible focus indicators. Screen readers announce meaningful labels for all controls. The UI renders correctly in light, dark, and high-contrast themes.

**Why this priority**: Accessibility is a marketplace requirement and enables a wider user base, but the extension is functional without it for sighted keyboard-and-mouse users.

**Independent Test**: Tab through all interactive elements in the sidebar. Verify each is focusable, activatable with Enter/Space, and has an `aria-label`.

**Acceptance Scenarios**:

1. **Given** a feature card is focused via Tab, **When** the user presses Enter, **Then** the feature is selected and the dashboard updates.
2. **Given** the extension is running with a high-contrast theme, **When** viewing the sidebar, **Then** all text is legible, stage dots are distinguishable, and progress rings use theme-appropriate colors.
3. **Given** a screen reader is active, **When** focus moves to a progress ring, **Then** it announces "Stages: 3 of 8 complete" (or equivalent).

---

### User Story 7 — Marketplace Publishing (Priority: P3)

The extension is published to the VS Code Marketplace under publisher `summitpatil` with the name `speckit-tracker` and display name "SpecKit - Spec-Driven Development Tracker". The marketplace listing includes an icon, description, screenshots, CHANGELOG, and LICENSE. A GitHub repository at `summitpatil/speckit-tracker` hosts the source with CI/CD for automated builds.

**Why this priority**: Publishing is the final step after all features are complete and tested.

**Independent Test**: Run `vsce package` and verify the VSIX contains no source files, includes LICENSE and CHANGELOG, and the marketplace preview renders correctly.

**Acceptance Scenarios**:

1. **Given** the extension is packaged, **When** inspecting the VSIX contents, **Then** it includes `out/`, `resources/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json` only.
2. **Given** the extension is published, **When** searching "speckit" on the marketplace, **Then** it appears with the correct icon, description, and publisher name.
3. **Given** a new version tag is pushed to GitHub, **When** CI runs, **Then** the extension is automatically compiled, tested, packaged, and published.

---

### Edge Cases

- What happens when a `specs/` directory exists but is empty? The sidebar shows "No features found" with a hint to run `/speckit.specify`.
- What happens when the `.git/HEAD` file is missing (not a git repo)? The extension still works; it defaults to the highest-numbered feature instead of matching by branch.
- What happens when a `spec.md` file is binary or unreadable? The parser catches the error and marks the stage as "not-started" rather than crashing.
- What happens when the user has 500+ features? Lazy loading shows 10 at a time with "Show More"; search filters client-side without performance issues.
- What happens when workspace folders are added or removed while the extension is running? File watchers are per-project; adding a new folder requires a manual refresh or reload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST activate automatically when a workspace contains `specs/` or `.specify/` directories.
- **FR-002**: The extension MUST display a sidebar panel in the activity bar with a custom icon.
- **FR-003**: The extension MUST parse `specs/###-feature-name/` directories and compute stage status (not-started, in-progress, complete) for each of the 8 Spec-Kit workflow stages.
- **FR-004**: The extension MUST display three SVG progress rings showing completion counts for Stages, Tasks, and Checks.
- **FR-005**: The extension MUST display a vertical workflow pipeline with color-coded status dots for each stage.
- **FR-006**: The extension MUST allow clicking artifact rows to open the corresponding file in the editor.
- **FR-007**: The extension MUST support multi-root workspaces, discovering all folders with `specs/` or `.specify/` and providing a project selector.
- **FR-008**: The extension MUST provide a search input that filters features by number, name, or branch name (client-side).
- **FR-009**: The extension MUST implement lazy loading, showing a configurable number of features initially with a "Show More" button.
- **FR-010**: The extension MUST detect the active feature by matching the current git branch to a feature directory name.
- **FR-011**: The extension MUST auto-refresh when files in `specs/`, `checklists/`, `contracts/`, `.specify/memory/constitution.md`, or `.git/HEAD` change.
- **FR-012**: The extension MUST provide a "New Feature" command that creates a feature directory and spec file.
- **FR-013**: The extension MUST display a status bar item showing the active project, feature, and progress percentage.
- **FR-014**: The extension MUST provide configurable settings for page size, auto-refresh, and status bar visibility.
- **FR-015**: All interactive WebView elements MUST be keyboard-accessible with `role`, `tabindex`, and `keydown` handlers.
- **FR-016**: The extension MUST include a `LICENSE` (MIT), `CHANGELOG.md`, and complete marketplace metadata in `package.json`.

### Key Entities

- **Project**: A workspace folder that contains `specs/` or `.specify/`. Has a name (folder basename), root path, and a parsed `SpecKitState`.
- **Feature**: A directory under `specs/` matching the pattern `###-feature-name`. Contains stages, artifacts, and an overall progress score.
- **Stage**: One of the 8 Spec-Kit workflow stages (Constitution, Specify, Clarify, Plan, Tasks, Checklist, Analyze, Implement). Has a status, label, description, optional file path, and child artifacts.
- **Artifact**: A file or directory within a feature directory (e.g. `spec.md`, `plan.md`, `contracts/`). Has existence status and optional progress (completed/total checkboxes).
- **Progress**: A triple of `{ total, completed, percentage }` computed from checkbox parsing or stage completion counting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Extension activates in under 500ms for a workspace with 3 projects and 20 total features.
- **SC-002**: All 8 workflow stages display correct status for a feature with known file states (verified by manual test matrix).
- **SC-003**: Task and checklist progress counts match actual `- [x]` / `- [ ]` counts in the source files (zero parsing errors).
- **SC-004**: Switching between projects in a multi-root workspace updates the dashboard in under 200ms.
- **SC-005**: The VSIX package size is under 200 KB.
- **SC-006**: All interactive elements are reachable via Tab and activatable via Enter/Space (verified by keyboard-only test).
- **SC-007**: The extension renders correctly in VS Code's default dark, light, and high-contrast themes (visual inspection, no hardcoded colors).
- **SC-008**: The extension is published on the VS Code Marketplace under publisher `summitpatil` with name `speckit-tracker`.

## Assumptions

- The Spec-Kit workflow uses the 8-stage model: Constitution, Specify, Clarify, Plan, Tasks, Checklist, Analyze, Implement.
- Feature directories follow the `###-feature-name` naming convention with zero-padded 3-digit numbers.
- The `.specify/scripts/bash/create-new-feature.sh` script outputs JSON with `BRANCH_NAME` and `SPEC_FILE` fields when called with `--json`.
- Git is available on the system and `.git/HEAD` contains a `ref: refs/heads/branch-name` line for branch detection.
- The extension targets VS Code 1.85+ and compatible editors (Cursor, VSCodium).
- No runtime npm dependencies are needed; the extension uses only VS Code API and Node.js built-ins.

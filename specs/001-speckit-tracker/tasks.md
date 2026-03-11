# Tasks: SpecKit Tracker

**Input**: Design documents from `specs/001-speckit-tracker/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize npm project with `package.json` (name, version, engines, activation events)
- [x] T002 Create `tsconfig.json` with strict mode, ES2020 target, `out/` outDir
- [x] T003 [P] Create `.gitignore` (out/, node_modules/, *.vsix)
- [x] T004 [P] Create `.vscodeignore` (src/, node_modules/, *.ts, *.map)
- [x] T005 [P] Install devDependencies: `@types/vscode`, `@types/node`, `typescript`, `@vscode/vsce`
- [x] T006 Create `src/models/types.ts` with all TypeScript interfaces and enums (StageStatus, WorkflowStage, StageInfo, ArtifactInfo, ProgressInfo, FeatureInfo, SpecKitState)

**Checkpoint**: Project compiles with `npm run compile`; produces empty `out/` output.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core extension activation and WebView registration

- [x] T007 Create `src/extension.ts` with `activate()` and `deactivate()` functions
- [x] T008 Register WebView view provider for `speckit-panel` in `activate()`
- [x] T009 Register commands: `speckit.refresh`, `speckit.openFile`
- [x] T010 [P] Create `resources/icons/speckit.svg` (monochrome activity bar icon)
- [x] T011 [P] Create `resources/icons/speckit-icon.png` (128x128 marketplace icon)
- [x] T012 Add `contributes.viewsContainers`, `contributes.views`, `contributes.commands`, `contributes.menus` to `package.json`

**Checkpoint**: Extension activates in F5 host; activity bar icon visible; empty sidebar panel renders.

---

## Phase 3: User Story 1 — Visual Development Dashboard (Priority: P1)

**Goal**: Render progress rings, workflow pipeline, and artifact rows in the WebView sidebar.

**Independent Test**: Open a workspace with `specs/###-feature/` containing known files. Verify rings show correct counts, pipeline shows correct stage statuses, artifact clicks open files.

### Implementation

- [x] T013 Create `src/parsers/specParser.ts` with `parseWorkspace()` method
- [x] T014 [US1] Implement `parseFeature()` — read directory name, extract number and name
- [x] T015 [US1] Implement `parseStages()` — check file existence for each of the 8 stages
- [x] T016 [US1] Implement `getSpecStatus()` — detect `[FEATURE NAME]` / `[Brief Title]` placeholders in spec.md
- [x] T017 [US1] Implement `hasClarificationSection()` — detect `## Clarifications` heading
- [x] T018 [US1] Implement `parseTaskProgress()` — count completed and pending checkbox patterns in markdown
- [x] T019 [US1] Implement `parseChecklistDir()` — iterate `checklists/*.md` with progress
- [x] T020 [US1] Implement `computeOverallProgress()` — count complete stages out of total
- [x] T021 Create `src/providers/SidebarWebviewProvider.ts` with `resolveWebviewView()`
- [x] T022 [US1] Implement `_getHtml()` — main HTML document with CSS variables and inline styles
- [x] T023 [US1] Implement `_progressSection()` — 3 SVG donut ring charts
- [x] T024 [US1] Implement `_progressCircle()` — individual SVG ring with stroke-dashoffset
- [x] T025 [US1] Implement `_workflowSection()` — vertical pipeline with stage rows
- [x] T026 [US1] Implement `_artifactRow()` — clickable artifact with icon, name, mini progress bar
- [x] T027 [US1] Implement `_esc()` — HTML escape helper for XSS prevention
- [x] T028 [US1] Add WebView message handler for `openFile` → dispatch `speckit.openFile` command
- [x] T029 [US1] Implement `openFile()` in extension.ts — handle files and directories with multiple .md files
- [x] T030 [US1] Add CSS for pipeline connector lines, stage dots, badges, artifact rows

**Checkpoint**: Dashboard renders with real data. Clicking artifacts opens files. Progress rings animate.

---

## Phase 4: User Story 2 — Multi-Project Workspace Support (Priority: P1)

**Goal**: Discover all qualifying workspace folders and provide a project selector dropdown.

**Independent Test**: Open a multi-root workspace where 2+ folders have `specs/`. Project dropdown lists both. Switching updates the dashboard.

### Implementation

- [x] T031 [US2] Add `ProjectInfo` and `MultiProjectState` interfaces to `src/models/types.ts`
- [x] T032 [US2] Implement `discoverProjectRoots()` in extension.ts — scan workspace folders for `specs/` or `.specify/`
- [x] T033 [US2] Update `refresh()` to iterate all project roots and build `MultiProjectState`
- [x] T034 [US2] Add `refreshMulti(multi: MultiProjectState)` method to SidebarWebviewProvider
- [x] T035 [US2] Implement `_projectSwitcher()` — dropdown for multiple projects, static label for single project
- [x] T036 [US2] Add WebView message handler for `selectProject` → update `activeProjectIndex` and re-render
- [x] T037 [US2] Add CSS for project switcher (dropdown, path display, feature count)

**Checkpoint**: Multi-root workspace shows project dropdown. Switching projects updates features and progress.

---

## Phase 5: User Story 3 — Feature Lifecycle Tracking (Priority: P1)

**Goal**: Auto-detect active feature from git branch and auto-refresh on file changes.

**Independent Test**: Check out a branch named `002-api-migration-utilities`. Verify that feature is auto-selected. Edit `tasks.md` and verify sidebar refreshes.

### Implementation

- [x] T038 [US3] Implement `detectActiveFeature()` — read `.git/HEAD`, match branch name to feature directory
- [x] T039 [US3] Add prefix matching — branch `002-something` matches `specs/002-*/` even if names differ
- [x] T040 [US3] Implement `setupAllWatchers()` — create file watchers for `specs/**/*.md`, `checklists/**`, `contracts/**`, `.specify/memory/constitution.md`, `.git/HEAD`
- [x] T041 [US3] Implement `debounce()` helper — 500ms debounce on refresh to avoid excessive re-parsing
- [x] T042 [US3] Implement `updateStatusBar()` — show `project / feature percentage` in status bar
- [x] T043 [US3] Add status bar item with `vscode.StatusBarAlignment.Left` and refresh command on click

**Checkpoint**: Switching git branches auto-selects the matching feature. Editing spec files triggers auto-refresh.

---

## Phase 6: User Story 4 — Feature Creation (Priority: P2)

**Goal**: Create new features from the sidebar UI or command palette.

**Independent Test**: Click "+ New", enter a description. Verify directory is created, spec.md opens, sidebar refreshes.

### Implementation

- [x] T044 [US4] Register `speckit.newFeature` command in extension.ts and package.json
- [x] T045 [US4] Implement `newFeature()` — project selection, description input, script detection
- [x] T046 [US4] Implement `runCreateScript()` — execFile with `--json`, parse output, open spec.md
- [x] T047 [US4] Implement `createFeatureManually()` — compute next number, create directory, copy template
- [x] T048 [US4] Add `newFeature` message handler in SidebarWebviewProvider
- [x] T049 [US4] Implement `_featuresSection()` — search input, feature cards, "+ New" button, "Show More"
- [x] T050 [US4] Add `$(add)` icon button to `view/title` menu for New Feature command
- [x] T051 [US4] Add CSS for new feature button, search input, clear button, show-more button

**Checkpoint**: "+ New" button creates feature via script (if available) or manual fallback. Sidebar refreshes.

---

## Phase 7: User Story 5 — Extension Settings (Priority: P2)

**Goal**: Add configurable settings for page size, auto-refresh, and status bar visibility.

**Independent Test**: Change `speckit.pageSize` to 5. Verify only 5 features show initially.

### Implementation

- [x] T052 [US5] Add `contributes.configuration` section to package.json with `speckit.pageSize`, `speckit.autoRefresh`, `speckit.showStatusBar`
- [x] T053 [US5] Read `speckit.pageSize` in SidebarWebviewProvider and inject as `PAGE_SIZE` constant in WebView JS
- [x] T054 [US5] Read `speckit.autoRefresh` in extension.ts; conditionally setup file watchers
- [x] T055 [US5] Read `speckit.showStatusBar` in extension.ts; conditionally show/hide status bar item
- [x] T056 [US5] Listen for `vscode.workspace.onDidChangeConfiguration` to apply setting changes without reload

**Checkpoint**: All three settings work and take effect immediately (no reload needed).

---

## Phase 8: User Story 6 — Accessibility and Theming (Priority: P2)

**Goal**: Make all WebView elements keyboard-accessible and theme-compatible.

**Independent Test**: Tab through all interactive elements. Verify focus is visible, Enter/Space activates them, screen reader announces labels.

### Implementation

- [x] T057 [P] [US6] Add `role="button"` and `tabindex="0"` to feature cards in `_featureCard()`
- [x] T058 [P] [US6] Add `role="button"` and `tabindex="0"` to stage content divs in `_workflowSection()`
- [x] T059 [P] [US6] Add `role="button"` and `tabindex="0"` to artifact rows in `_artifactRow()`
- [x] T060 [US6] Add `keydown` event listener in WebView JS: Enter/Space on focused `[role="button"]` triggers click
- [x] T061 [US6] Add `aria-label` to search input (`"Search features"`), project select (`"Select project"`), new feature button, refresh button
- [x] T062 [US6] Add `aria-hidden="true"` to decorative SVG elements in progress rings
- [x] T063 [US6] Add `aria-label` to progress ring containers (e.g. `"Stages: 3 of 8 complete"`)
- [x] T064 [US6] Add visible `:focus-visible` CSS styles (outline or border) for all focusable elements
- [x] T065 [US6] Audit and replace hardcoded color values (#e8843c, #4ec9b0, #e8c94c) with CSS custom properties that derive from `--vscode-*` variables where possible
- [x] T066 [US6] Test in VS Code light theme, dark theme, and high-contrast dark theme; fix any rendering issues

**Checkpoint**: Keyboard-only navigation works end-to-end. All themes render correctly.

---

## Phase 9: User Story 7 — Marketplace Publishing (Priority: P3)

**Goal**: Prepare and publish the extension to the VS Code Marketplace.

**Independent Test**: Run `vsce package`; inspect VSIX contents; verify all required files are present.

### Implementation

- [x] T067 [P] [US7] Create `LICENSE` file with MIT license text at repository root
- [x] T068 [P] [US7] Create `CHANGELOG.md` with version history (0.1.0 through current)
- [x] T069 [US7] Update `package.json`: `name` → `speckit-tracker`, `displayName` → `SpecKit - Spec-Driven Development Tracker`, `publisher` → `summitpatil`
- [x] T070 [US7] Add `repository`, `bugs`, `homepage`, `author`, `galleryBanner` fields to `package.json`
- [x] T071 [US7] Remove `--allow-missing-repository` from the `package` script in `package.json`
- [x] T072 [US7] Update `README.md`: real repo URL, correct version references, screenshots (HTTPS), badges
- [x] T073 [US7] Update `.vscodeignore` to exclude `DEVELOPMENT.md` and include `LICENSE`, `CHANGELOG.md`
- [x] T074 [US7] Initialize git repo, create GitHub repo at `summitpatil/speckit-tracker`, push code
- [x] T075 [P] [US7] Create `.github/workflows/ci.yml` — lint, compile, package on push/PR
- [x] T076 [P] [US7] Create `.github/workflows/publish.yml` — auto-publish to marketplace on version tag
- [x] T077 [US7] Create publisher account on VS Code Marketplace, generate PAT, run `vsce publish` — N/A: published on Open VSX; VS Code Marketplace optional

**Checkpoint**: Extension is live on the VS Code Marketplace. CI/CD runs on push.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and improvements that affect multiple user stories

- [x] T078 [P] Delete unused `src/providers/FeatureTreeProvider.ts` (legacy TreeView provider)
- [x] T079 [P] Delete unused `src/providers/WorkflowTreeProvider.ts` (legacy TreeView provider)
- [x] T080 Add try/catch error handling around all `fs.readFileSync` calls in `specParser.ts`
- [x] T081 Add graceful handling in `refresh()` when `specs/` directory is deleted while extension is active
- [x] T082 Add user-friendly error messages instead of silent catch blocks in `extension.ts`
- [x] T083 Delete old `.vsix` files from repository root (speckit-sidebar-0.1.0.vsix through 0.3.0.vsix)
- [x] T084 Update `DEVELOPMENT.md` to reflect new name, publisher, and all v1.0 features
- [x] T085 Run `npm run lint` and fix any ESLint issues (add `.eslintrc.json` if missing)
- [x] T086 Final `vsce package` size verification: confirm VSIX is under 200 KB

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — extension must compile
- **Phases 3–6 (US1–US4)**: Depend on Phase 2 — extension must activate
  - US1 (Dashboard) must complete before US2 (Multi-Project) can integrate
  - US3 (Lifecycle Tracking) can start in parallel with US2
  - US4 (Feature Creation) can start after US1
- **Phase 7 (Settings)**: Depends on Phases 3–6 — settings modify existing behavior
- **Phase 8 (Accessibility)**: Depends on Phases 3–6 — modifies existing HTML output
- **Phase 9 (Publishing)**: Depends on all previous phases
- **Phase 10 (Polish)**: Can run in parallel with Phase 9

### Parallel Opportunities

- Within each phase, tasks marked `[P]` can run in parallel
- Phases 7 and 8 can run in parallel (settings vs. accessibility are independent)
- Phase 10 tasks T078, T079 can run anytime after Phase 3

---

## Implementation Strategy

### MVP (Phases 1–6) — Complete

Phases 1 through 6 represent the original v0.3.0 state. All tasks are marked `[x]`.

### Pre-Publish (Phases 7–10) — Complete

### Pre-Publish (Phases 7–10) — Complete

All tasks complete. T074 (GitHub repo) and T077 (publishing) done; T077 closed as N/A for VS Code Marketplace (published on Open VSX).

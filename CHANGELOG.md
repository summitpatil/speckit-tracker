# Changelog

All notable changes to the **SpecKit - Spec-Driven Development Tracker** extension will be documented in this file.

## [1.0.1] - 2026-03-10

### Added
- **Feature progress = 100% when all tasks complete**: If every task in `tasks.md` is checked, the feature’s overall progress is shown as 100% (done), regardless of stage completion (spec clarification + parser update).
- Open VSX as primary install option in README with direct link to the registry.
- Cursor forum verification guide (`cursor-forum-verification.md`) aligned with the Extension Verification form (brief sentence, TLD, OpenVSX URL, website link, screenshot).
- Marketplace checklist (`checklists/marketplace.md`) converted to checkbox format so the sidebar shows correct progress (e.g. 47/47).

### Changed
- Publish workflow (`.github/workflows/publish.yml`): duplicate version publish no longer fails the job; logs a warning and continues.
- Task T018 description in `tasks.md` rephrased so the parser doesn’t count literal `- [x]` / `- [ ]` in the text (fixes spurious “1 task remaining”).
- Spec: added Clarifications (Session 2026-03-10), FR-013a, and Progress entity rule for “tasks done ⇒ feature done”.

### Fixed
- Sidebar task count: 86/86 when all tasks are complete (no false pending from T018 text).
- Checklist stage: `marketplace.md` now contributes to checks total and can show complete.

## [1.0.0] - 2026-03-09

### Added
- Configurable settings: `speckit.pageSize`, `speckit.autoRefresh`, `speckit.showStatusBar`
- Full keyboard accessibility: `role="button"`, `tabindex`, Enter/Space activation
- ARIA labels on all interactive elements (search, project select, progress rings, feature cards)
- `:focus-visible` styles for keyboard navigation
- `aria-live` regions for search results and feature count updates
- LICENSE (MIT) and CHANGELOG.md
- Marketplace metadata: `repository`, `bugs`, `homepage`, `author`, `galleryBanner`
- CI/CD GitHub Actions workflows for lint/compile and auto-publish

### Changed
- Extension renamed from `speckit-sidebar` to `speckit-tracker`
- Display name changed to "SpecKit - Spec-Driven Development Tracker"
- Publisher changed from `entrata-engineering` to `summitpatil`
- Hardcoded `#fff` replaced with theme-aware CSS variable
- `PAGE_SIZE` now reads from `speckit.pageSize` setting instead of hardcoded 10

### Removed
- Legacy TreeView providers (`FeatureTreeProvider.ts`, `WorkflowTreeProvider.ts`)
- Old VSIX build artifacts

## [0.3.0] - 2026-03-09

### Added
- "New Feature" button in sidebar and command palette
- Script-based feature creation via `.specify/scripts/bash/create-new-feature.sh`
- Manual feature creation fallback with auto-numbered directories

## [0.2.1] - 2026-03-09

### Added
- Multi-project workspace support with project selector dropdown
- Feature search with instant client-side filtering
- Lazy loading: show 10 features at a time with "Show More"
- Custom extension icon (seedling/sprout)

### Fixed
- Clicking missing artifacts no longer shows error messages

## [0.2.0] - 2026-03-09

### Changed
- Replaced plain TreeViews with rich WebView sidebar panel
- SVG progress ring charts for Stages, Tasks, and Checks
- Vertical workflow pipeline with color-coded stage dots and badges
- Nested artifact rows with mini progress bars

## [0.1.0] - 2026-03-09

### Added
- Initial release with TreeView-based sidebar
- Feature list with auto-detection from `specs/` directories
- 8-stage workflow visualization (Constitution through Implement)
- Task and checklist progress tracking (`- [x]` / `- [ ]` parsing)
- File system watchers for auto-refresh
- Git branch-based active feature detection
- Status bar integration showing project / feature / progress

# Data Model: SpecKit Tracker

**Branch**: `001-speckit-tracker` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)

All types are defined in `src/models/types.ts`. The extension uses no database; all data is parsed from the file system at runtime and held in memory as these TypeScript structures.

## Enums

### StageStatus

Represents the completion state of a workflow stage.

| Value | Meaning | Visual |
|-------|---------|--------|
| `not-started` | No artifacts exist for this stage | Gray dot, no badge |
| `in-progress` | Some artifacts exist or content has placeholders | Yellow dot, "WIP" badge |
| `complete` | All required artifacts exist with real content | Green dot, "DONE" badge |
| `skipped` | Stage was intentionally skipped | Reserved for future use |

### WorkflowStage

The 8 stages of the Spec-Kit development lifecycle, in execution order.

| Value | Label | Primary Artifact | Detection Logic |
|-------|-------|-----------------|-----------------|
| `constitution` | Constitution | `.specify/memory/constitution.md` | File exists → complete |
| `specify` | Specify | `spec.md` | File exists with placeholders → in-progress; without → complete |
| `clarify` | Clarify | `## Clarifications` section in `spec.md` | Section heading found → complete |
| `plan` | Plan | `plan.md` + `research.md` + `data-model.md` + `quickstart.md` + `contracts/` | All exist → complete; some → in-progress |
| `tasks` | Tasks | `tasks.md` | File exists → status based on checkbox completion |
| `checklist` | Checklist | `checklists/*.md` | Any `.md` files in dir → status based on checkbox completion |
| `analyze` | Analyze | None (read-only report) | Always `not-started` (no persistent artifact) |
| `implement` | Implement | None (tracks `tasks.md` completion) | All tasks done → complete; some → in-progress |

## Interfaces

### ProgressInfo

Tracks completion counts for any countable artifact (tasks, checklists, stages).

```typescript
interface ProgressInfo {
  total: number;       // Total items (checkboxes, stages, etc.)
  completed: number;   // Items marked complete
  percentage: number;  // Math.round((completed / total) * 100), 0 if total is 0
}
```

**Parsing**: `- [x]` (case-insensitive) counts as completed; `- [ ]` counts as pending. `total = completed + pending`.

### ArtifactInfo

Represents a single file or directory within a feature's spec directory.

```typescript
interface ArtifactInfo {
  name: string;         // Display name: "spec.md", "plan.md", "contracts/"
  filePath: string;     // Absolute path on disk
  exists: boolean;      // fs.existsSync(filePath)
  progress?: ProgressInfo;  // Only for files with checkboxes (tasks.md, checklists/*.md)
}
```

**UI mapping**: Exists + no progress → filled circle (●). Exists + partial progress → half circle (◐). Exists + 100% → checkmark (✓). Not exists → empty circle (○), dimmed, non-clickable.

### StageInfo

Represents one of the 8 workflow stages for a specific feature.

```typescript
interface StageInfo {
  stage: WorkflowStage;     // Enum value identifying the stage
  label: string;            // Human-readable label ("Specify", "Plan", etc.)
  status: StageStatus;      // Computed from artifact existence and content
  description: string;      // Tooltip text ("Feature specification", "Implementation plan")
  filePath?: string;        // Primary file to open when stage is clicked
  artifacts: ArtifactInfo[];  // Child artifacts displayed as rows under the stage
}
```

**Status computation**:
- All artifacts exist → `complete`
- Some artifacts exist or primary file exists → `in-progress`
- No artifacts exist → `not-started`
- Special cases: Specify checks for template placeholders; Clarify checks for `## Clarifications` heading; Implement mirrors Tasks completion

### FeatureInfo

Represents a single feature directory (`specs/###-feature-name/`).

```typescript
interface FeatureInfo {
  name: string;             // Human-readable: "api migration utilities" (from dir name, dashes replaced)
  number: string;           // Zero-padded 3-digit: "002"
  branchName: string;       // Full dir name: "002-api-migration-utilities"
  specDir: string;          // Absolute path to the feature directory
  stages: StageInfo[];      // Array of 8 StageInfo objects
  overallProgress: ProgressInfo;  // Stages completed out of total stages
}
```

**Sorting**: Features are sorted by number descending (newest first).

### SpecKitState

The parsed state of a single project (workspace folder).

```typescript
interface SpecKitState {
  workspaceRoot: string;        // Absolute path to the workspace folder
  features: FeatureInfo[];      // All parsed features, sorted by number desc
  activeFeature?: FeatureInfo;  // Feature matching current git branch, or highest number
  hasSpecifyDir: boolean;       // fs.existsSync(root + '/.specify')
  hasSpecsDir: boolean;         // fs.existsSync(root + '/specs')
}
```

### ProjectInfo

Associates a workspace folder with its parsed state.

```typescript
interface ProjectInfo {
  name: string;         // path.basename(rootPath) — e.g. "Entrata", "utilities"
  rootPath: string;     // Absolute path to the workspace folder
  state: SpecKitState;  // Parsed state for this project
}
```

### MultiProjectState

Top-level state holding all discovered projects and the currently active one.

```typescript
interface MultiProjectState {
  projects: ProjectInfo[];      // All workspace folders with specs/ or .specify/
  activeProjectIndex: number;   // Index into projects[] for the currently displayed project
}
```

## Entity Relationships

```
MultiProjectState
  └── ProjectInfo[]                 (1:N — one per qualifying workspace folder)
        ├── name
        ├── rootPath
        └── SpecKitState
              ├── workspaceRoot
              ├── hasSpecifyDir
              ├── hasSpecsDir
              ├── activeFeature ──→ FeatureInfo (reference into features[])
              └── FeatureInfo[]     (1:N — one per specs/###-*/ directory)
                    ├── name, number, branchName, specDir
                    ├── overallProgress: ProgressInfo
                    └── StageInfo[]  (always 8 — one per WorkflowStage)
                          ├── stage, label, status, description, filePath
                          └── ArtifactInfo[]  (0:N — files/dirs for this stage)
                                ├── name, filePath, exists
                                └── progress?: ProgressInfo
```

## Data Lifecycle

1. **Activation**: `discoverProjectRoots()` scans workspace folders for `specs/` or `.specify/`
2. **Parse**: For each root, `new SpecParser(root).parseWorkspace()` produces a `SpecKitState`
3. **Aggregate**: All `SpecKitState` objects are wrapped in `ProjectInfo` and assembled into `MultiProjectState`
4. **Render**: `SidebarWebviewProvider.refreshMulti(multiState)` generates HTML from the active project's state
5. **Interaction**: WebView sends messages (`selectProject`, `selectFeature`, `openFile`, `newFeature`) back to `extension.ts`
6. **Refresh**: File watchers or manual refresh trigger steps 2–4 again (full re-parse, full HTML regeneration)

## Future Considerations

- **Incremental parsing**: Currently the entire workspace is re-parsed on every change. For workspaces with 100+ features, delta parsing (only re-parse changed feature directories) could improve performance.
- **Persistent state**: Currently all state is ephemeral (re-parsed from disk). If caching is needed, `vscode.ExtensionContext.workspaceState` could store parsed state between sessions.
- **Settings integration**: The `pageSize` setting (US5) will need to be read from `vscode.workspace.getConfiguration('speckit')` and passed to the WebView as a constant in the generated JavaScript.

export enum StageStatus {
  NotStarted = 'not-started',
  InProgress = 'in-progress',
  Complete = 'complete',
  Skipped = 'skipped',
}

export enum WorkflowStage {
  Constitution = 'constitution',
  Specify = 'specify',
  Clarify = 'clarify',
  Plan = 'plan',
  Tasks = 'tasks',
  Checklist = 'checklist',
  Analyze = 'analyze',
  Implement = 'implement',
}

export interface StageInfo {
  stage: WorkflowStage;
  label: string;
  status: StageStatus;
  description: string;
  filePath?: string;
  artifacts: ArtifactInfo[];
}

export interface ArtifactInfo {
  name: string;
  filePath: string;
  exists: boolean;
  progress?: ProgressInfo;
}

export interface ProgressInfo {
  total: number;
  completed: number;
  percentage: number;
}

export interface FeatureInfo {
  name: string;
  number: string;
  branchName: string;
  specDir: string;
  stages: StageInfo[];
  overallProgress: ProgressInfo;
}

export interface SpecKitState {
  workspaceRoot: string;
  features: FeatureInfo[];
  activeFeature?: FeatureInfo;
  hasSpecifyDir: boolean;
  hasSpecsDir: boolean;
}

export interface ProjectInfo {
  name: string;
  rootPath: string;
  state: SpecKitState;
}

export interface MultiProjectState {
  projects: ProjectInfo[];
  activeProjectIndex: number;
}

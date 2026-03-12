import * as fs from 'fs';
import * as path from 'path';
import {
  FeatureInfo,
  StageInfo,
  StageStatus,
  WorkflowStage,
  ArtifactInfo,
  ProgressInfo,
  SpecKitState,
} from '../models/types';

export class SpecParser {
  constructor(private workspaceRoot: string) {}

  parseWorkspace(): SpecKitState {
    const specsDir = path.join(this.workspaceRoot, 'specs');
    const specifyDir = path.join(this.workspaceRoot, '.specify');
    const hasSpecsDir = fs.existsSync(specsDir);
    const hasSpecifyDir = fs.existsSync(specifyDir);

    const features: FeatureInfo[] = [];

    if (hasSpecsDir) {
      try {
        const entries = fs.readdirSync(specsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && /^\d{3}-/.test(entry.name)) {
            try {
              const featureDir = path.join(specsDir, entry.name);
              const feature = this.parseFeature(entry.name, featureDir);
              features.push(feature);
            } catch {
              // Skip individual features that fail to parse
            }
          }
        }
        features.sort((a, b) => parseInt(b.number) - parseInt(a.number));
      } catch {
        // specs/ directory may have been deleted or is inaccessible
      }
    }

    const activeFeature = this.detectActiveFeature(features);

    return {
      workspaceRoot: this.workspaceRoot,
      features,
      activeFeature,
      hasSpecifyDir,
      hasSpecsDir,
    };
  }

  private detectActiveFeature(features: FeatureInfo[]): FeatureInfo | undefined {
    if (features.length === 0) { return undefined; }

    let currentBranch: string | undefined;
    try {
      const gitHeadPath = path.join(this.workspaceRoot, '.git', 'HEAD');
      if (fs.existsSync(gitHeadPath)) {
        const head = fs.readFileSync(gitHeadPath, 'utf-8').trim();
        if (head.startsWith('ref: refs/heads/')) {
          currentBranch = head.replace('ref: refs/heads/', '');
        }
      }
    } catch {
      // ignore git errors
    }

    if (currentBranch) {
      const match = features.find(f => f.branchName === currentBranch);
      if (match) { return match; }

      const prefix = currentBranch.match(/^(\d{3})-/);
      if (prefix) {
        const byPrefix = features.find(f => f.number === prefix[1]);
        if (byPrefix) { return byPrefix; }
      }
    }

    return features[0];
  }

  private parseFeature(dirName: string, featureDir: string): FeatureInfo {
    const match = dirName.match(/^(\d{3})-(.+)$/);
    const number = match ? match[1] : '000';
    const name = match ? match[2].replace(/-/g, ' ') : dirName;

    const stages = this.parseStages(featureDir);
    let overallProgress = this.computeOverallProgress(stages);
    const tasksStage = stages.find(s => s.stage === WorkflowStage.Tasks);
    const tasksProgress = tasksStage?.artifacts?.[0]?.progress;
    if (tasksProgress && tasksProgress.percentage === 100) {
      overallProgress = { total: stages.length, completed: stages.length, percentage: 100 };
    }
    return {
      name,
      number,
      branchName: dirName,
      specDir: featureDir,
      stages,
      overallProgress,
    };
  }

  private parseStages(featureDir: string): StageInfo[] {
    const constitutionPath = path.join(this.workspaceRoot, '.specify', 'memory', 'constitution.md');
    const specPath = path.join(featureDir, 'spec.md');
    const planPath = path.join(featureDir, 'plan.md');
    const tasksPath = path.join(featureDir, 'tasks.md');
    const researchPath = path.join(featureDir, 'research.md');
    const dataModelPath = path.join(featureDir, 'data-model.md');
    const quickstartPath = path.join(featureDir, 'quickstart.md');
    const contractsDir = path.join(featureDir, 'contracts');
    const checklistsDir = path.join(featureDir, 'checklists');

    const stages: StageInfo[] = [];

    // Constitution
    stages.push(this.buildStage(
      WorkflowStage.Constitution,
      'Constitution',
      'Project governance principles',
      constitutionPath,
      [{ name: 'constitution.md', filePath: constitutionPath, exists: fs.existsSync(constitutionPath) }],
    ));

    // Specify
    const specArtifacts: ArtifactInfo[] = [
      { name: 'spec.md', filePath: specPath, exists: fs.existsSync(specPath) },
    ];
    const specStatus = this.getSpecStatus(specPath);
    stages.push({
      stage: WorkflowStage.Specify,
      label: 'Specify',
      status: specStatus,
      description: 'Feature specification',
      filePath: specPath,
      artifacts: specArtifacts,
    });

    // Clarify
    const hasClarifications = this.hasClarificationSection(specPath);
    stages.push({
      stage: WorkflowStage.Clarify,
      label: 'Clarify',
      status: hasClarifications ? StageStatus.Complete : StageStatus.NotStarted,
      description: 'Spec clarification Q&A',
      filePath: specPath,
      artifacts: [],
    });

    // Plan
    const planArtifacts: ArtifactInfo[] = [
      { name: 'plan.md', filePath: planPath, exists: fs.existsSync(planPath) },
      { name: 'research.md', filePath: researchPath, exists: fs.existsSync(researchPath) },
      { name: 'data-model.md', filePath: dataModelPath, exists: fs.existsSync(dataModelPath) },
      { name: 'quickstart.md', filePath: quickstartPath, exists: fs.existsSync(quickstartPath) },
      { name: 'contracts/', filePath: contractsDir, exists: fs.existsSync(contractsDir) && this.dirHasFiles(contractsDir) },
    ];
    stages.push(this.buildStage(
      WorkflowStage.Plan,
      'Plan',
      'Implementation plan & design',
      planPath,
      planArtifacts,
    ));

    // Tasks
    const tasksArtifacts: ArtifactInfo[] = [
      { name: 'tasks.md', filePath: tasksPath, exists: fs.existsSync(tasksPath) },
    ];
    if (fs.existsSync(tasksPath)) {
      tasksArtifacts[0].progress = this.parseTaskProgress(tasksPath);
    }
    stages.push(this.buildStage(
      WorkflowStage.Tasks,
      'Tasks',
      'Implementation task list',
      tasksPath,
      tasksArtifacts,
    ));

    // Checklist
    const checklistArtifacts = this.parseChecklistDir(checklistsDir);
    stages.push({
      stage: WorkflowStage.Checklist,
      label: 'Checklist',
      status: checklistArtifacts.length > 0 ? this.getChecklistOverallStatus(checklistArtifacts) : StageStatus.NotStarted,
      description: 'Quality checklists',
      filePath: checklistsDir,
      artifacts: checklistArtifacts,
    });

    // Analyze (read-only report, no file)
    stages.push({
      stage: WorkflowStage.Analyze,
      label: 'Analyze',
      status: StageStatus.NotStarted,
      description: 'Cross-artifact consistency analysis',
      artifacts: [],
    });

    // Implement
    const taskProgress = fs.existsSync(tasksPath) ? this.parseTaskProgress(tasksPath) : undefined;
    stages.push({
      stage: WorkflowStage.Implement,
      label: 'Implement',
      status: taskProgress && taskProgress.percentage === 100 ? StageStatus.Complete
        : taskProgress && taskProgress.completed > 0 ? StageStatus.InProgress
          : StageStatus.NotStarted,
      description: 'Code implementation',
      artifacts: [],
    });

    return stages;
  }

  private buildStage(
    stage: WorkflowStage,
    label: string,
    description: string,
    primaryFilePath: string,
    artifacts: ArtifactInfo[],
  ): StageInfo {
    const primaryExists = fs.existsSync(primaryFilePath);
    const allExist = artifacts.length > 0 && artifacts.every(a => a.exists);
    const someExist = artifacts.some(a => a.exists);

    let status: StageStatus;
    if (allExist) {
      status = StageStatus.Complete;
    } else if (someExist) {
      status = StageStatus.InProgress;
    } else if (primaryExists) {
      status = StageStatus.InProgress;
    } else {
      status = StageStatus.NotStarted;
    }

    return { stage, label, status, description, filePath: primaryFilePath, artifacts };
  }

  private getSpecStatus(specPath: string): StageStatus {
    if (!fs.existsSync(specPath)) { return StageStatus.NotStarted; }

    try {
      const content = fs.readFileSync(specPath, 'utf-8');
      const hasPlaceholders = content.includes('[FEATURE NAME]') || content.includes('[Brief Title]');
      if (hasPlaceholders) { return StageStatus.InProgress; }
      return StageStatus.Complete;
    } catch {
      return StageStatus.NotStarted;
    }
  }

  private hasClarificationSection(specPath: string): boolean {
    if (!fs.existsSync(specPath)) { return false; }
    try {
      const content = fs.readFileSync(specPath, 'utf-8');
      return content.includes('## Clarifications');
    } catch {
      return false;
    }
  }

  parseTaskProgress(tasksPath: string): ProgressInfo {
    try {
      const content = fs.readFileSync(tasksPath, 'utf-8');
      const completedPattern = /- \[x\]/gi;
      const pendingPattern = /- \[ \]/g;
      const completed = (content.match(completedPattern) || []).length;
      const pending = (content.match(pendingPattern) || []).length;
      const total = completed + pending;
      return {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    } catch {
      return { total: 0, completed: 0, percentage: 0 };
    }
  }

  private parseChecklistDir(checklistsDir: string): ArtifactInfo[] {
    if (!fs.existsSync(checklistsDir)) { return []; }

    const artifacts: ArtifactInfo[] = [];
    try {
      const entries = fs.readdirSync(checklistsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const filePath = path.join(checklistsDir, entry.name);
          artifacts.push({
            name: entry.name,
            filePath,
            exists: true,
            progress: this.parseTaskProgress(filePath),
          });
        }
      }
    } catch {
      // ignore read errors
    }
    return artifacts;
  }

  private getChecklistOverallStatus(artifacts: ArtifactInfo[]): StageStatus {
    const allComplete = artifacts.every(a => a.progress && a.progress.percentage === 100);
    const someProgress = artifacts.some(a => a.progress && a.progress.completed > 0);
    if (allComplete) { return StageStatus.Complete; }
    if (someProgress) { return StageStatus.InProgress; }
    return StageStatus.InProgress;
  }

  private dirHasFiles(dirPath: string): boolean {
    try {
      const entries = fs.readdirSync(dirPath);
      return entries.length > 0;
    } catch {
      return false;
    }
  }

  private computeOverallProgress(stages: StageInfo[]): ProgressInfo {
    const total = stages.length;
    const completed = stages.filter(s => s.status === StageStatus.Complete).length;
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

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

    const features = hasSpecsDir ? this.discoverFeatures(specsDir) : [];

    const activeFeature = this.detectActiveFeature(features);

    return {
      workspaceRoot: this.workspaceRoot,
      features,
      activeFeature,
      hasSpecifyDir,
      hasSpecsDir,
    };
  }

  private discoverFeatures(specsDir: string): FeatureInfo[] {
    const features: FeatureInfo[] = [];

    try {
      for (const candidate of this.findFeatureDirs(specsDir)) {
        try {
          features.push(this.parseFeature(candidate.dirName, candidate.featureDir, candidate.relativeSpecPath));
        } catch {
          // Skip individual features that fail to parse
        }
      }
    } catch {
      // specs/ directory may have been deleted or is inaccessible
    }

    return features.sort((a, b) => this.compareFeatures(a, b));
  }

  private findFeatureDirs(
    specsDir: string,
  ): Array<{ dirName: string; featureDir: string; relativeSpecPath: string }> {
    const candidates: Array<{ dirName: string; featureDir: string; relativeSpecPath: string }> = [];
    const maxDepth = 5;

    const walk = (currentDir: string, depth: number): void => {
      if (depth > maxDepth) { return; }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      const hasSpecFile = entries.some(entry => entry.isFile() && entry.name === 'spec.md');
      if (currentDir !== specsDir && hasSpecFile) {
        candidates.push({
          dirName: path.basename(currentDir),
          featureDir: currentDir,
          relativeSpecPath: this.toPosixPath(path.relative(specsDir, currentDir)),
        });
        return;
      }

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
        walk(path.join(currentDir, entry.name), depth + 1);
      }
    };

    walk(specsDir, 0);
    return candidates;
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

      const branchLeaf = currentBranch.split('/').pop() ?? currentBranch;
      const byLeaf = features.find(f => path.basename(f.branchName) === branchLeaf);
      if (byLeaf) { return byLeaf; }

      const byDeclaredBranch = features.find(f => this.readDeclaredBranch(f.specDir) === currentBranch);
      if (byDeclaredBranch) { return byDeclaredBranch; }

      const ticket = currentBranch.match(/[A-Z]+-\d+/i);
      if (ticket) {
        const ticketId = ticket[0].toLowerCase();
        const byTicket = features.find(f =>
          f.number.toLowerCase() === ticketId || f.branchName.toLowerCase().includes(ticketId),
        );
        if (byTicket) { return byTicket; }
      }

      const prefix = branchLeaf.match(/^(\d{3})-/);
      if (prefix) {
        const byPrefix = features.find(f => f.number === prefix[1]);
        if (byPrefix) { return byPrefix; }
      }
    }

    return features[0];
  }

  private parseFeature(dirName: string, featureDir: string, relativeSpecPath = dirName): FeatureInfo {
    const numberedMatch = dirName.match(/^(\d{3})-(.+)$/);
    const ticketMatch = dirName.match(/^([A-Z]+-\d+)-(.+)$/i);
    const number = numberedMatch?.[1] ?? ticketMatch?.[1] ?? 'SPEC';
    const nameSource = numberedMatch?.[2] ?? ticketMatch?.[2] ?? dirName;
    const name = nameSource.replace(/[-_]/g, ' ');

    const stages = this.parseStages(featureDir);
    let overallProgress = this.computeOverallProgress(stages);
    const tasksStage = stages.find(s => s.stage === WorkflowStage.Tasks);
    const tasksProgress = tasksStage?.artifacts?.[0]?.progress;
    if (tasksProgress && tasksProgress.total > 0) {
      overallProgress = {
        total: tasksProgress.total,
        completed: tasksProgress.completed,
        percentage: tasksProgress.percentage,
      };
    }
    return {
      name,
      number,
      branchName: relativeSpecPath,
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

  private readDeclaredBranch(featureDir: string): string | undefined {
    try {
      const content = fs.readFileSync(path.join(featureDir, 'spec.md'), 'utf-8');
      const match = content.match(/\*\*(?:Feature Branch|Branch)\*\*:\s*`([^`]+)`/);
      return match?.[1];
    } catch {
      return undefined;
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

  private compareFeatures(a: FeatureInfo, b: FeatureInfo): number {
    const aSort = this.getFeatureSortValue(a);
    const bSort = this.getFeatureSortValue(b);

    if (aSort !== undefined && bSort !== undefined && aSort !== bSort) {
      return bSort - aSort;
    }

    return b.branchName.localeCompare(a.branchName);
  }

  private getFeatureSortValue(feature: FeatureInfo): number | undefined {
    const match = feature.number.match(/\d+/);
    return match ? parseInt(match[0], 10) : undefined;
  }

  private toPosixPath(filePath: string): string {
    return filePath.split(path.sep).join('/');
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

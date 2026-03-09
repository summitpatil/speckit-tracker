import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { SpecParser } from './parsers/specParser';
import { SidebarWebviewProvider } from './providers/SidebarWebviewProvider';
import { MultiProjectState, ProjectInfo } from './models/types';

let sidebarProvider: SidebarWebviewProvider;
let multiState: MultiProjectState = { projects: [], activeProjectIndex: 0 };
let statusBarItem: vscode.StatusBarItem;
let fileWatchers: vscode.FileSystemWatcher[] = [];
let extensionContext: vscode.ExtensionContext;

function getConfig<T>(key: string): T {
  return vscode.workspace.getConfiguration('speckit').get(key) as T;
}

export function activate(context: vscode.ExtensionContext): void {
  extensionContext = context;
  const projectRoots = discoverProjectRoots();
  if (projectRoots.length === 0) {
    vscode.window.showWarningMessage('Spec-Kit: No workspace folders with specs/ or .specify/ found.');
    return;
  }

  sidebarProvider = new SidebarWebviewProvider(context.extensionUri, () => getConfig<number>('pageSize'));

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarWebviewProvider.viewType,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBarItem.command = 'speckit.refresh';
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('speckit.refresh', () => refresh()),
    vscode.commands.registerCommand('speckit.openFile', (filePath: string) => openFile(filePath)),
    vscode.commands.registerCommand('speckit.newFeature', (projectRoot?: string) => newFeature(projectRoot)),
  );

  if (getConfig<boolean>('autoRefresh')) {
    setupAllWatchers(projectRoots, context);
  }

  applyStatusBarVisibility();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('speckit.autoRefresh')) {
        for (const watcher of fileWatchers) { watcher.dispose(); }
        fileWatchers = [];
        if (getConfig<boolean>('autoRefresh')) {
          setupAllWatchers(discoverProjectRoots(), extensionContext);
        }
      }
      if (e.affectsConfiguration('speckit.showStatusBar')) {
        applyStatusBarVisibility();
      }
      if (e.affectsConfiguration('speckit.pageSize')) {
        sidebarProvider.refreshMulti(multiState);
      }
    }),
  );

  refresh();
}

function applyStatusBarVisibility(): void {
  if (getConfig<boolean>('showStatusBar')) {
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

function discoverProjectRoots(): string[] {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) { return []; }

  const roots: string[] = [];
  for (const folder of folders) {
    const specsDir = path.join(folder.uri.fsPath, 'specs');
    const specifyDir = path.join(folder.uri.fsPath, '.specify');
    if (fs.existsSync(specsDir) || fs.existsSync(specifyDir)) {
      roots.push(folder.uri.fsPath);
    }
  }
  return roots;
}

function refresh(): void {
  try {
    const projectRoots = discoverProjectRoots();
    const projects: ProjectInfo[] = projectRoots.map(root => {
      const parser = new SpecParser(root);
      return {
        name: path.basename(root),
        rootPath: root,
        state: parser.parseWorkspace(),
      };
    });

    const prevActiveName = multiState.projects[multiState.activeProjectIndex]?.name;
    let newActiveIndex = 0;

    if (prevActiveName) {
      const idx = projects.findIndex(p => p.name === prevActiveName);
      if (idx >= 0) { newActiveIndex = idx; }
    }

    multiState = { projects, activeProjectIndex: newActiveIndex };
    sidebarProvider.refreshMulti(multiState);
    updateStatusBar();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`SpecKit: Could not read workspace data. ${message}`);
  }
}

function openFile(filePath: string): void {
  if (!filePath || !fs.existsSync(filePath)) { return; }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(filePath).filter(f =>
        f.endsWith('.md') || f.endsWith('.yaml') || f.endsWith('.yml'),
      );
      if (files.length === 1) {
        vscode.window.showTextDocument(vscode.Uri.file(path.join(filePath, files[0])));
      } else if (files.length > 1) {
        vscode.window.showQuickPick(files, { placeHolder: 'Select a file to open' }).then(selected => {
          if (selected) {
            vscode.window.showTextDocument(vscode.Uri.file(path.join(filePath, selected)));
          }
        });
      }
    } else {
      vscode.window.showTextDocument(vscode.Uri.file(filePath));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(`SpecKit: Unable to open file. ${message}`);
  }
}

async function newFeature(projectRoot?: string): Promise<void> {
  let targetRoot = projectRoot;

  if (!targetRoot) {
    const project = multiState.projects[multiState.activeProjectIndex];
    if (project) {
      targetRoot = project.rootPath;
    }
  }

  if (!targetRoot) {
    const roots = discoverProjectRoots();
    if (roots.length === 0) {
      vscode.window.showWarningMessage('Spec-Kit: No project with specs/ or .specify/ found.');
      return;
    }
    if (roots.length === 1) {
      targetRoot = roots[0];
    } else {
      const picked = await vscode.window.showQuickPick(
        roots.map(r => ({ label: path.basename(r), description: r, root: r })),
        { placeHolder: 'Select a project for the new feature' },
      );
      if (!picked) { return; }
      targetRoot = picked.root;
    }
  }

  const description = await vscode.window.showInputBox({
    title: 'New Feature',
    prompt: 'Describe the feature (e.g., "Add user authentication")',
    placeHolder: 'Feature description...',
    ignoreFocusOut: true,
  });

  if (!description || !description.trim()) { return; }

  const scriptPath = path.join(targetRoot, '.specify', 'scripts', 'bash', 'create-new-feature.sh');
  const hasScript = fs.existsSync(scriptPath);

  if (hasScript) {
    await runCreateScript(targetRoot, scriptPath, description.trim());
  } else {
    await createFeatureManually(targetRoot, description.trim());
  }
}

function runCreateScript(cwd: string, scriptPath: string, description: string): Promise<void> {
  return new Promise((resolve) => {
    execFile('bash', [scriptPath, '--json', description], { cwd }, (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Spec-Kit: Failed to create feature: ${stderr || error.message}`);
        resolve();
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        const specFile = result.SPEC_FILE;
        vscode.window.showInformationMessage(`Spec-Kit: Created feature branch ${result.BRANCH_NAME}`);
        refresh();
        if (specFile && fs.existsSync(specFile)) {
          vscode.window.showTextDocument(vscode.Uri.file(specFile));
        }
      } catch {
        vscode.window.showInformationMessage('Spec-Kit: Feature created.');
        refresh();
      }

      resolve();
    });
  });
}

async function createFeatureManually(rootPath: string, description: string): Promise<void> {
  const specsDir = path.join(rootPath, 'specs');
  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  let highestNum = 0;
  try {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const match = entry.name.match(/^(\d{3})-/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highestNum) { highestNum = num; }
        }
      }
    }
  } catch { /* ignore */ }

  const nextNum = String(highestNum + 1).padStart(3, '0');
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 4)
    .join('-');

  const branchName = `${nextNum}-${slug}`;
  const featureDir = path.join(specsDir, branchName);
  fs.mkdirSync(featureDir, { recursive: true });

  const templatePath = path.join(rootPath, '.specify', 'templates', 'spec-template.md');
  const specFile = path.join(featureDir, 'spec.md');

  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, specFile);
  } else {
    const defaultSpec = `# Feature Specification: ${description}\n\n**Feature Branch**: \`${branchName}\`\n**Created**: ${new Date().toISOString().split('T')[0]}\n**Status**: Draft\n`;
    fs.writeFileSync(specFile, defaultSpec, 'utf-8');
  }

  vscode.window.showInformationMessage(`Spec-Kit: Created ${branchName}`);
  refresh();
  vscode.window.showTextDocument(vscode.Uri.file(specFile));
}

function updateStatusBar(): void {
  if (!getConfig<boolean>('showStatusBar')) { return; }

  const project = multiState.projects[multiState.activeProjectIndex];
  if (!project) {
    statusBarItem.text = '$(file-code) Spec-Kit';
    statusBarItem.tooltip = 'No projects found';
    statusBarItem.show();
    return;
  }

  const active = project.state.activeFeature;
  if (!active) {
    statusBarItem.text = `$(file-code) ${project.name}`;
    statusBarItem.tooltip = `Project: ${project.name}\nNo active feature`;
    statusBarItem.show();
    return;
  }

  const pct = active.overallProgress.percentage;
  statusBarItem.text = `$(file-code) ${project.name} / ${active.branchName} ${pct}%`;
  statusBarItem.tooltip = `Project: ${project.name}\nFeature: ${active.branchName}\n${active.overallProgress.completed}/${active.overallProgress.total} stages`;
  statusBarItem.show();
}

function setupAllWatchers(roots: string[], context: vscode.ExtensionContext): void {
  for (const watcher of fileWatchers) { watcher.dispose(); }
  fileWatchers = [];

  const patterns = [
    'specs/**/*.md',
    'specs/**/checklists/**',
    'specs/**/contracts/**',
    '.specify/memory/constitution.md',
  ];

  const debouncedRefresh = debounce(refresh, 500);

  for (const root of roots) {
    for (const pat of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(root, pat),
      );
      watcher.onDidCreate(() => debouncedRefresh());
      watcher.onDidChange(() => debouncedRefresh());
      watcher.onDidDelete(() => debouncedRefresh());
      context.subscriptions.push(watcher);
      fileWatchers.push(watcher);
    }

    const gitHeadPath = path.join(root, '.git', 'HEAD');
    if (fs.existsSync(gitHeadPath)) {
      const gitWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(root, '.git/HEAD'),
      );
      gitWatcher.onDidChange(() => debouncedRefresh());
      context.subscriptions.push(gitWatcher);
      fileWatchers.push(gitWatcher);
    }
  }
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: unknown[]) => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function deactivate(): void {
  for (const watcher of fileWatchers) { watcher.dispose(); }
  fileWatchers = [];
}

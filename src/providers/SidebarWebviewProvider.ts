import * as vscode from 'vscode';
import {
  MultiProjectState,
  FeatureInfo, StageStatus, StageInfo, ArtifactInfo, SpecKitState,
} from '../models/types';

export class SidebarWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'speckit-panel';

  private _view?: vscode.WebviewView;
  private _multi?: MultiProjectState;
  private _getPageSize: () => number;

  constructor(private readonly _extensionUri: vscode.Uri, getPageSize?: () => number) {
    this._getPageSize = getPageSize ?? (() => 10);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case 'openFile':
          if (msg.path) {
            vscode.commands.executeCommand('speckit.openFile', msg.path);
          }
          break;
        case 'selectProject':
          if (this._multi && typeof msg.index === 'number') {
            this._multi.activeProjectIndex = msg.index;
            this._renderHtml();
          }
          break;
        case 'selectFeature':
          if (msg.branchName && this._multi) {
            const project = this._multi.projects[this._multi.activeProjectIndex];
            if (project) {
              const feature = project.state.features.find(f => f.branchName === msg.branchName);
              if (feature) {
                project.state.activeFeature = feature;
                this._renderHtml();
              }
            }
          }
          break;
        case 'newFeature':
          if (this._multi) {
            const project = this._multi.projects[this._multi.activeProjectIndex];
            vscode.commands.executeCommand('speckit.newFeature', project?.rootPath);
          }
          break;
        case 'refresh':
          vscode.commands.executeCommand('speckit.refresh');
          break;
      }
    });

    this._renderHtml();
  }

  /** @deprecated Use refreshMulti instead */
  refresh(state: SpecKitState): void {
    this._multi = {
      projects: [{ name: 'default', rootPath: state.workspaceRoot, state }],
      activeProjectIndex: 0,
    };
    this._renderHtml();
  }

  refreshMulti(multi: MultiProjectState): void {
    this._multi = multi;
    this._renderHtml();
  }

  private _renderHtml(): void {
    if (!this._view) { return; }
    this._view.webview.html = this._getHtml();
  }

  private _getHtml(): string {
    const multi = this._multi;
    const project = multi?.projects[multi.activeProjectIndex];
    const state = project?.state;
    const active = state?.activeFeature;

    const projectSwitcherHtml = this._projectSwitcher(multi);

    const totalFeatures = state?.features.length ?? 0;
    const featuresHtml = totalFeatures > 0
      ? this._featuresSection(state!.features, active)
      : '<div class="empty-state"><p>No features found</p><p class="hint">Run <code>/speckit.specify</code> to get started</p></div>';

    const workflowHtml = active
      ? this._workflowSection(active)
      : '<div class="empty-state"><p class="hint">Select a feature above</p></div>';

    const progressHtml = active
      ? this._progressSection(active)
      : '';

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --accent: #e8843c;
    --accent-dim: rgba(232, 132, 60, 0.15);
    --success: #4ec9b0;
    --success-dim: rgba(78, 201, 176, 0.15);
    --warn: #e8c94c;
    --warn-dim: rgba(232, 201, 76, 0.15);
    --muted: var(--vscode-descriptionForeground);
    --border: var(--vscode-widget-border, rgba(255,255,255,0.08));
    --card-bg: var(--vscode-editor-background);
    --card-hover: var(--vscode-list-hoverBackground);
    --input-bg: var(--vscode-input-background, #2a2a2a);
    --input-border: var(--vscode-input-border, rgba(255,255,255,0.1));
    --input-fg: var(--vscode-input-foreground, inherit);
    --radius: 8px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
    padding: 0 8px 16px 8px;
    line-height: 1.5;
  }

  /* ── Project switcher ── */
  .project-switcher {
    padding: 10px 0 4px 0;
  }
  .project-select-wrap {
    position: relative;
  }
  .project-select {
    width: 100%;
    padding: 7px 28px 7px 10px;
    border-radius: var(--radius);
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--input-fg);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    appearance: none;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }
  .project-select:hover,
  .project-select:focus {
    border-color: var(--accent);
  }
  .project-select-arrow {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    font-size: 10px;
    color: var(--muted);
  }
  .project-path {
    font-size: 10px;
    color: var(--muted);
    padding: 3px 2px 0 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .project-count {
    font-size: 10px;
    color: var(--muted);
    padding: 2px 0 0 0;
    text-align: right;
  }

  /* ── Section headers ── */
  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 0 6px 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--muted);
  }
  .section-header .icon { font-size: 14px; }

  /* ── Progress circles ── */
  .progress-row {
    display: flex;
    justify-content: space-around;
    padding: 12px 0 16px 0;
    gap: 4px;
  }
  .progress-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 1;
  }
  .progress-ring {
    position: relative;
    width: 56px;
    height: 56px;
  }
  .progress-ring svg {
    transform: rotate(-90deg);
    width: 56px;
    height: 56px;
  }
  .progress-ring .bg {
    fill: none;
    stroke: var(--border);
    stroke-width: 4;
  }
  .progress-ring .fg {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.6s ease;
  }
  .progress-ring .value {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
  }
  .progress-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    text-align: center;
    line-height: 1.2;
  }

  /* ── Feature cards ── */
  .feature-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius);
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    margin-bottom: 2px;
  }
  .feature-card:hover { background: var(--card-hover); }
  .feature-card.active {
    background: var(--accent-dim);
    border-color: var(--accent);
  }
  .feature-number {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-dim);
    padding: 2px 6px;
    border-radius: 4px;
    min-width: 32px;
    text-align: center;
  }
  .feature-name {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .feature-pct {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }

  /* ── Pipeline ── */
  .pipeline {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 4px 0;
  }
  .stage-row {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0;
    position: relative;
  }
  .stage-connector {
    width: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex-shrink: 0;
  }
  .stage-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: var(--card-bg);
    z-index: 1;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .stage-dot.complete { background: var(--success); border-color: var(--success); }
  .stage-dot.in-progress { background: var(--warn); border-color: var(--warn); box-shadow: 0 0 6px var(--warn-dim); }
  .stage-line {
    width: 2px;
    height: 100%;
    background: var(--border);
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 0;
  }
  .stage-row:first-child .stage-line { top: 50%; height: 50%; }
  .stage-row:last-child .stage-line { height: 50%; }
  .stage-content {
    flex: 1;
    padding: 6px 8px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background 0.15s;
    min-width: 0;
  }
  .stage-content:hover { background: var(--card-hover); }
  .stage-title {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .stage-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .badge-done { background: var(--success-dim); color: var(--success); }
  .badge-wip { background: var(--warn-dim); color: var(--warn); }

  /* ── Artifacts ── */
  .artifacts { margin-left: 32px; padding: 2px 0 4px 0; }
  .artifact-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    transition: background 0.15s;
  }
  .artifact-row:hover { background: var(--card-hover); }
  .artifact-row.missing { opacity: 0.4; cursor: default; }
  .artifact-icon { font-size: 12px; width: 14px; text-align: center; }
  .artifact-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .artifact-progress { font-size: 10px; color: var(--muted); font-weight: 600; }

  /* ── Mini bar ── */
  .mini-bar { width: 40px; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .mini-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
  .mini-bar-fill.green { background: var(--success); }
  .mini-bar-fill.yellow { background: var(--warn); }

  /* ── Search input ── */
  .feature-search {
    position: relative;
    margin-bottom: 6px;
  }
  .feature-search-icon {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--muted);
    pointer-events: none;
  }
  .feature-search input {
    width: 100%;
    padding: 6px 8px 6px 28px;
    border-radius: var(--radius);
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--input-fg);
    font-family: inherit;
    font-size: 11px;
    outline: none;
    transition: border-color 0.15s;
  }
  .feature-search input::placeholder { color: var(--muted); opacity: 0.6; }
  .feature-search input:focus { border-color: var(--accent); }
  .feature-search-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 3px;
    display: none;
  }
  .feature-search-clear:hover { color: var(--vscode-foreground); background: var(--card-hover); }

  /* ── Show more button ── */
  .show-more-btn {
    display: block;
    width: 100%;
    padding: 6px 0;
    margin-top: 4px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--muted);
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .show-more-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-dim);
  }

  .feature-count-label {
    font-size: 10px;
    color: var(--muted);
    text-align: right;
    padding: 2px 2px 0 0;
  }

  /* ── Empty / Divider ── */
  .empty-state { text-align: center; padding: 24px 12px; color: var(--muted); }
  .empty-state p { margin: 4px 0; }
  .hint { font-size: 11px; opacity: 0.7; }
  code { background: var(--accent-dim); color: var(--accent); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  .divider { height: 1px; background: var(--border); margin: 8px 0; }
  .no-match { text-align: center; padding: 12px 0; color: var(--muted); font-size: 11px; display: none; }

  /* ── New Feature button ── */
  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0 6px 0;
  }
  .section-header-row .section-header {
    padding: 0;
  }
  .new-feature-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid var(--accent);
    background: var(--accent-dim);
    color: var(--accent);
    font-family: inherit;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .new-feature-btn:hover {
    background: var(--accent);
    color: var(--vscode-editor-background, #fff);
  }
  .new-feature-btn .plus {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }

  /* ── Focus visible ── */
  [role="button"]:focus-visible,
  button:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--vscode-focusBorder, var(--accent));
    outline-offset: 1px;
  }
  .feature-card:focus-visible {
    background: var(--card-hover);
  }
  .stage-content:focus-visible {
    background: var(--card-hover);
  }
  .artifact-row:focus-visible {
    background: var(--card-hover);
  }

  /* ── Live region ── */
  .no-match[role="status"] { text-align: center; padding: 12px 0; color: var(--muted); font-size: 11px; display: none; }
</style>
</head>
<body>

  ${projectSwitcherHtml}

  <div class="divider"></div>

  ${progressHtml}

  ${featuresHtml}

  <div class="divider"></div>

  <div class="section-header">
    <span class="icon">⚡</span> Workflow
  </div>
  ${workflowHtml}

<script>
  const vscode = acquireVsCodeApi();
  const PAGE_SIZE = ${this._getPageSize()};
  let visibleCount = PAGE_SIZE;
  let searchTerm = '';

  function applyFilter() {
    const cards = document.querySelectorAll('.feature-card');
    const noMatch = document.getElementById('no-match');
    const showMoreBtn = document.getElementById('show-more-btn');
    const countLabel = document.getElementById('feature-count-label');
    let matchCount = 0;
    let shownCount = 0;

    cards.forEach((card) => {
      const text = (card.dataset.search || '').toLowerCase();
      const matches = !searchTerm || text.includes(searchTerm.toLowerCase());
      if (matches) {
        matchCount++;
        if (searchTerm || matchCount <= visibleCount) {
          card.style.display = '';
          shownCount++;
        } else {
          card.style.display = 'none';
        }
      } else {
        card.style.display = 'none';
      }
    });

    if (noMatch) noMatch.style.display = matchCount === 0 && searchTerm ? 'block' : 'none';

    if (showMoreBtn) {
      const remaining = matchCount - shownCount;
      if (!searchTerm && remaining > 0) {
        showMoreBtn.style.display = 'block';
        showMoreBtn.textContent = 'Show ' + Math.min(remaining, PAGE_SIZE) + ' more (' + remaining + ' remaining)';
      } else {
        showMoreBtn.style.display = 'none';
      }
    }

    if (countLabel) {
      countLabel.textContent = searchTerm
        ? matchCount + ' of ' + cards.length + ' features'
        : shownCount + ' of ' + cards.length + ' features';
    }
  }

  const searchInput = document.getElementById('feature-search');
  const clearBtn = document.getElementById('feature-search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = searchTerm ? 'block' : 'none';
      applyFilter();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchTerm = '';
      clearBtn.style.display = 'none';
      applyFilter();
      searchInput && searchInput.focus();
    });
  }

  const showMoreBtn = document.getElementById('show-more-btn');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      visibleCount += PAGE_SIZE;
      applyFilter();
    });
  }

  applyFilter();

  function handleActivation(el) {
    const featureCard = el.closest('[data-feature]');
    if (featureCard) {
      vscode.postMessage({ type: 'selectFeature', branchName: featureCard.dataset.feature });
      return;
    }
    const fileEl = el.closest('[data-file]');
    if (fileEl && !fileEl.classList.contains('missing')) {
      vscode.postMessage({ type: 'openFile', path: fileEl.dataset.file });
      return;
    }
  }

  document.addEventListener('click', (e) => handleActivation(e.target));

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute('role') === 'button') {
      e.preventDefault();
      e.target.click();
    }
  });

  const newFeatureBtn = document.getElementById('new-feature-btn');
  if (newFeatureBtn) {
    newFeatureBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'newFeature' });
    });
  }

  const projectSelect = document.getElementById('project-select');
  if (projectSelect) {
    projectSelect.addEventListener('change', (e) => {
      vscode.postMessage({ type: 'selectProject', index: parseInt(e.target.value, 10) });
    });
  }
</script>
</body>
</html>`;
  }

  // ── Project Switcher ──

  private _projectSwitcher(multi?: MultiProjectState): string {
    if (!multi || multi.projects.length === 0) {
      return '<div class="empty-state"><p>No spec-kit projects found</p></div>';
    }

    const project = multi.projects[multi.activeProjectIndex];
    const featureCount = project?.state.features.length ?? 0;

    if (multi.projects.length === 1) {
      return `<div class="project-switcher">
        <div class="section-header"><span class="icon">📂</span> Project</div>
        <div style="padding:4px 2px;font-size:13px;font-weight:600;">${this._esc(project.name)}</div>
        <div class="project-path">${this._esc(project.rootPath)}</div>
        <div class="project-count">${featureCount} feature${featureCount !== 1 ? 's' : ''}</div>
      </div>`;
    }

    const options = multi.projects.map((p, i) => {
      const selected = i === multi.activeProjectIndex ? 'selected' : '';
      const fCount = p.state.features.length;
      return `<option value="${i}" ${selected}>${this._esc(p.name)} (${fCount})</option>`;
    }).join('');

    return `<div class="project-switcher">
      <div class="section-header"><span class="icon">📂</span> Project</div>
      <div class="project-select-wrap">
        <select id="project-select" class="project-select" aria-label="Select project">${options}</select>
        <span class="project-select-arrow">▼</span>
      </div>
      <div class="project-path">${this._esc(project.rootPath)}</div>
      <div class="project-count">${featureCount} feature${featureCount !== 1 ? 's' : ''}</div>
    </div>`;
  }

  // ── Features Section (search + lazy load wrapper) ──

  private _featuresSection(features: FeatureInfo[], active?: FeatureInfo): string {
    const cards = features.map(f =>
      this._featureCard(f, f.branchName === active?.branchName),
    ).join('');

    return `
      <div class="section-header-row">
        <div class="section-header">
          <span class="icon">📋</span> Features
        </div>
        <button id="new-feature-btn" class="new-feature-btn" title="Start a new feature" aria-label="Start a new feature">
          <span class="plus">+</span> New
        </button>
      </div>
      <div class="feature-search">
        <span class="feature-search-icon">🔍</span>
        <input id="feature-search" type="text" placeholder="Search features..." autocomplete="off" spellcheck="false" aria-label="Search features" />
        <button id="feature-search-clear" class="feature-search-clear" title="Clear">✕</button>
      </div>
      <div id="feature-list">${cards}</div>
      <div id="no-match" class="no-match" role="status" aria-live="polite">No matching features</div>
      <button id="show-more-btn" class="show-more-btn" style="display:none;"></button>
      <div id="feature-count-label" class="feature-count-label" aria-live="polite"></div>`;
  }

  // ── Feature Card ──

  private _featureCard(f: FeatureInfo, isActive: boolean): string {
    const pct = f.overallProgress.percentage;
    const searchText = `${f.number} ${f.name} ${f.branchName}`;
    return `<div class="feature-card ${isActive ? 'active' : ''}" data-feature="${f.branchName}" data-search="${this._esc(searchText)}" role="button" tabindex="0" aria-label="Feature ${f.number}: ${this._esc(f.name)}, ${pct}% complete">
      <span class="feature-number">${f.number}</span>
      <span class="feature-name">${this._esc(f.name)}</span>
      <span class="feature-pct">${pct}%</span>
    </div>`;
  }

  // ── Progress Section ──

  private _progressSection(f: FeatureInfo): string {
    const stages = f.stages;
    const done = stages.filter(s => s.status === StageStatus.Complete).length;
    const total = stages.length;

    const taskStage = stages.find(s => s.stage === ('tasks' as unknown));
    const taskArtifact = taskStage?.artifacts.find(a => a.name === 'tasks.md');
    const tasksDone = taskArtifact?.progress?.completed ?? 0;
    const tasksTotal = taskArtifact?.progress?.total ?? 0;

    const checkStage = stages.find(s => s.stage === ('checklist' as unknown));
    const checksDone = checkStage?.artifacts.reduce((sum, a) => sum + (a.progress?.completed ?? 0), 0) ?? 0;
    const checksTotal = checkStage?.artifacts.reduce((sum, a) => sum + (a.progress?.total ?? 0), 0) ?? 0;

    return `
      <div class="section-header"><span class="icon">📊</span> Progress</div>
      <div class="progress-row">
        ${this._progressCircle(done, total, 'Stages', 'var(--accent)')}
        ${this._progressCircle(tasksDone, tasksTotal, 'Tasks', 'var(--success)')}
        ${this._progressCircle(checksDone, checksTotal, 'Checks', 'var(--warn)')}
      </div>
      <div class="divider"></div>`;
  }

  private _progressCircle(value: number, max: number, label: string, color: string): string {
    const r = 22;
    const circumference = 2 * Math.PI * r;
    const pct = max > 0 ? value / max : 0;
    const offset = circumference * (1 - pct);

    return `<div class="progress-item" aria-label="${label}: ${value} of ${max} complete">
      <div class="progress-ring">
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <circle class="bg" cx="28" cy="28" r="${r}"/>
          <circle class="fg" cx="28" cy="28" r="${r}"
            stroke="${color}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"/>
        </svg>
        <div class="value" aria-hidden="true">${value}</div>
      </div>
      <div class="progress-label" aria-hidden="true">${label}<br>of ${max}</div>
    </div>`;
  }

  // ── Workflow Pipeline ──

  private _workflowSection(f: FeatureInfo): string {
    const rows = f.stages.map((stage) => {
      const dotClass = stage.status === StageStatus.Complete ? 'complete'
        : stage.status === StageStatus.InProgress ? 'in-progress'
          : '';

      const badge = stage.status === StageStatus.Complete
        ? '<span class="stage-badge badge-done">done</span>'
        : stage.status === StageStatus.InProgress
          ? '<span class="stage-badge badge-wip">wip</span>'
          : '';

      const artifactsHtml = stage.artifacts.length > 0
        ? `<div class="artifacts">${stage.artifacts.map(a => this._artifactRow(a)).join('')}</div>`
        : '';

      const stageIcon = this._stageIcon(stage);
      const hasFile = stage.filePath && stage.status !== StageStatus.NotStarted;
      const fileAttr = hasFile ? `data-file="${stage.filePath}"` : '';

      const statusLabel = stage.status === StageStatus.Complete ? 'complete'
        : stage.status === StageStatus.InProgress ? 'in progress' : 'not started';

      return `<div class="stage-row">
        <div class="stage-connector">
          <div class="stage-line"></div>
          <div class="stage-dot ${dotClass}"></div>
        </div>
        <div class="stage-content" ${fileAttr} role="button" tabindex="0" aria-label="${stage.label}: ${statusLabel}">
          <div class="stage-title">
            ${stageIcon} ${stage.label} ${badge}
          </div>
        </div>
      </div>
      ${artifactsHtml}`;
    });

    return `<div class="pipeline">${rows.join('')}</div>`;
  }

  private _artifactRow(a: ArtifactInfo): string {
    const icon = !a.exists ? '○'
      : a.progress && a.progress.percentage === 100 ? '✓'
        : a.progress && a.progress.completed > 0 ? '◐'
          : '●';

    const progressHtml = a.progress
      ? `<span class="artifact-progress">${a.progress.completed}/${a.progress.total}</span>
         <div class="mini-bar"><div class="mini-bar-fill ${a.progress.percentage === 100 ? 'green' : 'yellow'}" style="width:${a.progress.percentage}%"></div></div>`
      : '';

    const fileAttr = a.exists ? `data-file="${a.filePath}"` : '';
    const ariaAttrs = a.exists
      ? `role="button" tabindex="0" aria-label="${a.name}${a.progress ? `, ${a.progress.completed} of ${a.progress.total}` : ''}"`
      : `aria-disabled="true" aria-label="${a.name}, not created"`;
    return `<div class="artifact-row ${a.exists ? '' : 'missing'}" ${fileAttr} ${ariaAttrs}>
      <span class="artifact-icon">${icon}</span>
      <span class="artifact-name">${a.name}</span>
      ${progressHtml}
    </div>`;
  }

  private _stageIcon(stage: StageInfo): string {
    const icons: Record<string, string> = {
      constitution: '📜',
      specify: '📝',
      clarify: '💬',
      plan: '🗺️',
      tasks: '✅',
      checklist: '☑️',
      analyze: '🔍',
      implement: '🚀',
    };
    return icons[stage.stage] || '○';
  }

  private _esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

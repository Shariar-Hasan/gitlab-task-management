/**
 * localStorage persistence layer for GitLab Task Manager
 * Strategy: localStorage is the single source of truth for issue data.
 * API calls only happen on first load or explicit force-refresh.
 */

const PREFIX = 'gtm_ls_';

const KEYS = {
  issues:           `${PREFIX}issues`,
  projects:         `${PREFIX}projects`,
  pinned:           `${PREFIX}pinned`,
  settings:         `${PREFIX}settings`,
  lastFetchedAt:    `${PREFIX}last_fetched_at`,
  globalLabels:     `${PREFIX}global_labels`,
  customStatuses:   `${PREFIX}custom_statuses`,
  projectOverrides: `${PREFIX}project_overrides`,   // { [id]: { customName, enabled } }
  templates:        `${PREFIX}templates`,            // description templates
  activeFilters:    `${PREFIX}active_filters`,      // persisted active filters
  lastUpdateCheck:  `${PREFIX}last_update_check`,   // timestamp
  latestVersion:    `${PREFIX}latest_version`,      // latest release version string
  boardStatuses:    `${PREFIX}board_statuses`,      // board view statuses configuration
};

export const CLOSED_CUTOFF_DAYS = 30;

export interface BoardStatusConfig {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
  isSystem?: boolean; // true for 'open' and 'close'
  dotClass?: string;
}

export type TaskStatus = BoardStatusConfig;

// ── Default Board Statuses (open & close are GitLab system statuses) ─────────
export const DEFAULT_BOARD_STATUSES: BoardStatusConfig[] = [
  { id: 'open',    label: 'Open',    color: '#10b981', enabled: true,  isSystem: true,  dotClass: 'bg-emerald-500' },
  { id: 'ongoing', label: 'Ongoing', color: '#06b6d4', enabled: true,  isSystem: false, dotClass: 'bg-cyan-500' },
  { id: 'testing', label: 'Testing', color: '#ec4899', enabled: true,  isSystem: false, dotClass: 'bg-pink-500' },
  { id: 'pending', label: 'Pending', color: '#f59e0b', enabled: true,  isSystem: false, dotClass: 'bg-amber-500' },
  { id: 'backlog', label: 'Backlog', color: '#8b5cf6', enabled: true,  isSystem: false, dotClass: 'bg-purple-500' },
  { id: 'close',   label: 'Closed',  color: '#64748b', enabled: true,  isSystem: true,  dotClass: 'bg-slate-500' },
];

export function getEffectiveStatus(issue: any, customStatusesMap: Record<string, string> = {}): string {
  const key = `${issue.project_id}_${issue.iid}`;
  const custom = customStatusesMap[key];
  if (custom) return custom;
  return issue.state === 'closed' ? 'close' : 'open';
}

export interface GlobalLabelDef {
  id: string;
  name: string;
  color: string;
  description: string;
}

// ── Default Global Labels ─────────────────────────────────────────────────────
export const DEFAULT_GLOBAL_LABELS: GlobalLabelDef[] = [
  { id: 'gl-bug',     name: 'Bug',           color: '#ef4444', description: 'Defects or unexpected issues' },
  { id: 'gl-feat',    name: 'Feature',       color: '#3b82f6', description: 'New feature development' },
  { id: 'gl-urgent',  name: 'Urgent',        color: '#f59e0b', description: 'High priority / blocker' },
  { id: 'gl-polish',  name: 'Improvement',   color: '#8b5cf6', description: 'Refinement, polish, refactor' },
  { id: 'gl-docs',    name: 'Documentation', color: '#10b981', description: 'Docs and guides' },
  { id: 'gl-review',  name: 'Review',        color: '#ec4899', description: 'Code or design review needed' },
];

// ── safe JSON helpers ─────────────────────────────────────────────────────────
function get<T = any>(key: string, fallback: T | null = null): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set(key: string, value: any): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export interface TemplateItem {
  id: string;
  name: string;
  content: string;
}

// ── Default description templates ────────────────────────────────────────────
export const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl-bug',
    name: 'Bug Report',
    content: `## Bug Description\n\nA clear description of what the bug is.\n\n## Steps to Reproduce\n\n1. Go to ...\n2. Click on ...\n3. See error\n\n## Expected Behavior\n\nWhat should have happened.\n\n## Actual Behavior\n\nWhat actually happened.\n\n## Screenshots / Logs\n\n(Paste screenshots or error logs here)`,
  },
  {
    id: 'tpl-feature',
    name: 'Feature Request',
    content: `## Feature Description\n\nBrief summary of the feature.\n\n## Problem / Motivation\n\nWhat problem does this solve?\n\n## Proposed Solution\n\nHow should it work?\n\n## Acceptance Criteria\n\n- [ ] Criterion 1\n- [ ] Criterion 2`,
  },
  {
    id: 'tpl-task',
    name: 'General Task',
    content: `## Task Overview\n\nBrief description of what needs to be done.\n\n## Checklist\n\n- [ ] Step 1\n- [ ] Step 2\n- [ ] Review & Test\n\n## Notes\n\n(Additional context here)`,
  },
];

export interface AppSettings {
  autoAssignOnCreate: boolean;
  timeFormat: 'relative' | 'absolute' | string;
  clockFormat: '12h' | '24h' | string;
  dateFormat: string;
  retentionDays: number;
  compactTable: boolean;
  defaultFilterProjects: string[];
  defaultFilterStatus: string[];
  defaultFilterLabels: string[];
  accentColor: string;
  persistFilters: boolean;
  updateCheckHours: number;
  githubRepo: string;
  viewMode: 'table' | 'board' | string;
  boardColumns: string[];
  [key: string]: any;
}

// ── Default settings ──────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  autoAssignOnCreate: false,
  timeFormat: 'relative',    // 'relative' | 'absolute'
  clockFormat: '12h',        // '12h' | '24h'
  dateFormat: 'MMM d, yyyy', // 'MMM d, yyyy' | 'yyyy-MM-dd' | 'dd/MM/yyyy'
  retentionDays: 30,         // days before pruning closed issues
  compactTable: false,
  defaultFilterProjects: [],  // string project IDs
  defaultFilterStatus: [],    // multi-select: array of status IDs e.g. ['open', 'ongoing'] or [] for all
  defaultFilterLabels: [],    // string label names
  accentColor: '#10b981',     // custom accent color hex
  persistFilters: true,       // save active filters across reload
  updateCheckHours: 4,        // how many hours between update checks
  githubRepo: 'Shariar-Hasan/gitlab-task-management', // github repo for version check
  viewMode: 'table',          // 'table' | 'board'
  boardColumns: ['open', 'ongoing', 'testing', 'pending', 'backlog', 'close'],
};

// ── Accent Color Applicator ───────────────────────────────────────────────────
export function applyAccentColor(hex: string): void {
  if (!hex || typeof hex !== 'string') return;
  const clean = hex.startsWith('#') ? hex : `#${hex}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(clean)) return;

  const root = document.documentElement;
  root.style.setProperty('--accent', clean);
  root.style.setProperty('--accent-hover', clean);
  root.style.setProperty('--accent-muted', `${clean}1f`);
  root.style.setProperty('--accent-glow', `0 0 14px ${clean}33`);
}

export interface ProjectOverride {
  customName?: string;
  enabled?: boolean;
}

export interface ActiveFilters {
  filterProjects: string[];
  filterStatus: string[];
  filterLabels: string[];
  globalFilter: string;
  assignedToMe: boolean;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export const localStore = {
  // Issues
  getIssues:    (): any[] => get(KEYS.issues, []) ?? [],
  setIssues:    (issues: any[]) => set(KEYS.issues, issues),

  // Projects
  getProjects:  (): any[] => get(KEYS.projects, []) ?? [],
  setProjects:  (projects: any[]) => set(KEYS.projects, projects),

  // Last fetched timestamp
  getLastFetchedAt: (): number | null => get(KEYS.lastFetchedAt, null),
  setLastFetchedAt: (ts: number = Date.now()) => set(KEYS.lastFetchedAt, ts),
  hasEverFetched:   (): boolean => get(KEYS.lastFetchedAt, null) !== null,

  // Pinned tasks — stored as "projectId_iid" strings
  getPinned: (): Set<string> => new Set(get<string[]>(KEYS.pinned, []) ?? []),
  setPinned: (pinned: Set<string> | string[]) => set(KEYS.pinned, [...pinned]),
  togglePin(projectId: string | number, iid: string | number): Set<string> {
    const key = `${projectId}_${iid}`;
    const pinned = this.getPinned();
    pinned.has(key) ? pinned.delete(key) : pinned.add(key);
    this.setPinned(pinned);
    return pinned;
  },
  isPinned: (projectId: string | number, iid: string | number): boolean => localStore.getPinned().has(`${projectId}_${iid}`),

  // Global Labels
  getGlobalLabels: (): GlobalLabelDef[] => {
    const saved = get<GlobalLabelDef[]>(KEYS.globalLabels, null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      set(KEYS.globalLabels, DEFAULT_GLOBAL_LABELS);
      return DEFAULT_GLOBAL_LABELS;
    }
    return saved;
  },
  setGlobalLabels: (labels: GlobalLabelDef[]) => set(KEYS.globalLabels, labels),
  resetGlobalLabels: (): GlobalLabelDef[] => {
    set(KEYS.globalLabels, DEFAULT_GLOBAL_LABELS);
    return DEFAULT_GLOBAL_LABELS;
  },

  // Custom Statuses — stored as { "projectId_iid": "ongoing" | "testing" | "pending" | "backlog" | "open" | "close" }
  getCustomStatuses: (): Record<string, string> => get(KEYS.customStatuses, {}) ?? {},
  setCustomStatuses: (map: Record<string, string>) => set(KEYS.customStatuses, map),
  setCustomStatus(projectId: string | number, iid: string | number, status: string): Record<string, string> {
    const map = this.getCustomStatuses();
    const key = `${projectId}_${iid}`;
    map[key] = status;
    this.setCustomStatuses(map);
    return map;
  },
  deleteCustomStatus(projectId: string | number, iid: string | number): Record<string, string> {
    const map = this.getCustomStatuses();
    const key = `${projectId}_${iid}`;
    delete map[key];
    this.setCustomStatuses(map);
    return map;
  },

  // App settings
  getSettings: (): AppSettings => {
    const raw = get<Partial<AppSettings>>(KEYS.settings, {}) ?? {};
    const merged = { ...DEFAULT_SETTINGS, ...raw };
    // Normalize defaultFilterStatus to array
    if ((merged.defaultFilterStatus as any) === 'all' || !merged.defaultFilterStatus) {
      merged.defaultFilterStatus = [];
    } else if (typeof merged.defaultFilterStatus === 'string') {
      merged.defaultFilterStatus = [merged.defaultFilterStatus];
    }
    return merged;
  },
  setSettings: (s: AppSettings) => set(KEYS.settings, s),
  updateSettings(patch: Partial<AppSettings>): AppSettings {
    const updated = { ...this.getSettings(), ...patch };
    this.setSettings(updated);
    return updated;
  },

  /**
   * Remove closed issues older than retentionDays (default 30) from an array.
   * Called on every page load so stale data never accumulates.
   */
  pruneStaleClosedIssues(issues: any[]): any[] {
    const settings = this.getSettings();
    const days = settings.retentionDays || CLOSED_CUTOFF_DAYS;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return issues.filter((i) => {
      if (i.state !== 'closed') return true;
      const closedAt = new Date(i.closed_at || i.updated_at || 0).getTime();
      return closedAt >= cutoff;
    });
  },

  // ── Project Overrides (custom names + enabled/disabled) ──────────────────────
  getProjectOverrides: (): Record<string, ProjectOverride> => get(KEYS.projectOverrides, {}) ?? {},
  setProjectOverrides: (overrides: Record<string, ProjectOverride>) => set(KEYS.projectOverrides, overrides),
  updateProjectOverride(projectId: string | number, patch: Partial<ProjectOverride>): Record<string, ProjectOverride> {
    const map = this.getProjectOverrides();
    map[String(projectId)] = { ...(map[String(projectId)] || {}), ...patch };
    this.setProjectOverrides(map);
    return map;
  },

  // ── Description Templates ─────────────────────────────────────────────────
  getTemplates: (): TemplateItem[] => {
    const saved = get<TemplateItem[]>(KEYS.templates, null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      set(KEYS.templates, DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    return saved;
  },
  setTemplates: (templates: TemplateItem[]) => set(KEYS.templates, templates),
  resetTemplates: (): TemplateItem[] => {
    set(KEYS.templates, DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  },

  // ── Persistent Active Filters ─────────────────────────────────────────────
  getActiveFilters: (): ActiveFilters => get(KEYS.activeFilters, {
    filterProjects: [],
    filterStatus: [],
    filterLabels: [],
    globalFilter: '',
    assignedToMe: false,
  }) ?? {
    filterProjects: [],
    filterStatus: [],
    filterLabels: [],
    globalFilter: '',
    assignedToMe: false,
  },
  setActiveFilters: (filters: ActiveFilters) => set(KEYS.activeFilters, filters),

  // ── Version / Update Check ────────────────────────────────────────────────
  getLastUpdateCheck: (): number | null => get(KEYS.lastUpdateCheck, null),
  setLastUpdateCheck: (ts: number = Date.now()) => set(KEYS.lastUpdateCheck, ts),
  getLatestVersion: (): string | null => get(KEYS.latestVersion, null),
  setLatestVersion: (v: string | null) => set(KEYS.latestVersion, v),

  // ── Board View Statuses ───────────────────────────────────────────────────
  getBoardStatuses(): BoardStatusConfig[] {
    const saved = get<BoardStatusConfig[]>(KEYS.boardStatuses, null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      set(KEYS.boardStatuses, DEFAULT_BOARD_STATUSES);
      return DEFAULT_BOARD_STATUSES;
    }
    // Guarantee 'open' and 'close' always exist and are marked isSystem
    let list = saved.map((s) => (s.id === 'open' || s.id === 'close' ? { ...s, isSystem: true } : s));
    if (!list.some((s) => s.id === 'open')) {
      list = [{ id: 'open', label: 'Open', color: '#10b981', enabled: true, isSystem: true, dotClass: 'bg-emerald-500' }, ...list];
    }
    if (!list.some((s) => s.id === 'close')) {
      list = [...list, { id: 'close', label: 'Closed', color: '#64748b', enabled: true, isSystem: true, dotClass: 'bg-slate-500' }];
    }
    return list;
  },

  setBoardStatuses(statuses: BoardStatusConfig[]): BoardStatusConfig[] {
    let sanitized = statuses.map((s) => (s.id === 'open' || s.id === 'close' ? { ...s, isSystem: true } : s));
    if (!sanitized.some((s) => s.id === 'open')) {
      sanitized = [{ id: 'open', label: 'Open', color: '#10b981', enabled: true, isSystem: true, dotClass: 'bg-emerald-500' }, ...sanitized];
    }
    if (!sanitized.some((s) => s.id === 'close')) {
      sanitized = [...sanitized, { id: 'close', label: 'Closed', color: '#64748b', enabled: true, isSystem: true, dotClass: 'bg-slate-500' }];
    }
    set(KEYS.boardStatuses, sanitized);
    TASK_STATUSES = sanitized;
    return sanitized;
  },

  updateBoardStatus(id: string, patch: Partial<BoardStatusConfig>): BoardStatusConfig[] {
    const current = this.getBoardStatuses();
    const updated = current.map((s) => {
      if (s.id !== id) return s;
      // 'open' and 'close' cannot change id and cannot be deleted, but can be enabled/disabled and recolored
      const cleanPatch = s.isSystem
        ? { enabled: patch.enabled !== undefined ? patch.enabled : s.enabled, color: patch.color || s.color }
        : patch;
      return { ...s, ...cleanPatch };
    });
    return this.setBoardStatuses(updated);
  },

  addBoardStatus(label: string, color: string): BoardStatusConfig[] {
    const trimmed = label.trim();
    if (!trimmed) return this.getBoardStatuses();
    const id = trimmed.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30) || `st_${Date.now()}`;
    if (id === 'open' || id === 'close') return this.getBoardStatuses(); // Cannot create system statuses
    const current = this.getBoardStatuses();
    if (current.some((s) => s.id === id)) {
      return this.updateBoardStatus(id, { label: trimmed, color, enabled: true });
    }
    const newStatus: BoardStatusConfig = {
      id,
      label: trimmed,
      color: color || '#8b5cf6',
      enabled: true,
      isSystem: false,
    };
    return this.setBoardStatuses([...current, newStatus]);
  },

  deleteBoardStatus(id: string): BoardStatusConfig[] {
    if (id === 'open' || id === 'close') return this.getBoardStatuses(); // Cannot delete system statuses!
    const current = this.getBoardStatuses();
    const filtered = current.filter((s) => s.id !== id);
    return this.setBoardStatuses(filtered);
  },

  resetBoardStatuses(): BoardStatusConfig[] {
    set(KEYS.boardStatuses, DEFAULT_BOARD_STATUSES);
    TASK_STATUSES = DEFAULT_BOARD_STATUSES;
    return DEFAULT_BOARD_STATUSES;
  },

  // Full wipe
  clear(): void {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

// ── Exported TASK_STATUSES (always in sync with localStore) ────────────────────
export let TASK_STATUSES: BoardStatusConfig[] = localStore.getBoardStatuses();

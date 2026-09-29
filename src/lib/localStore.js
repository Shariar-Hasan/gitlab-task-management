/**
 * localStorage persistence layer for GitLab Task Manager
 * Strategy: localStorage is the single source of truth for issue data.
 * API calls only happen on first load or explicit force-refresh.
 */

const PREFIX = 'gtm_ls_';

const KEYS = {
  issues:         `${PREFIX}issues`,
  projects:       `${PREFIX}projects`,
  pinned:         `${PREFIX}pinned`,
  settings:       `${PREFIX}settings`,
  lastFetchedAt:  `${PREFIX}last_fetched_at`,
  globalLabels:   `${PREFIX}global_labels`,
  customStatuses: `${PREFIX}custom_statuses`,
};

export const CLOSED_CUTOFF_DAYS = 30;

// ── Task Statuses (open & close sync with GitLab; others managed locally) ───────
export const TASK_STATUSES = [
  { id: 'open',    label: 'Open',    color: '#10b981', dotClass: 'bg-emerald-500' },
  { id: 'ongoing', label: 'Ongoing', color: '#06b6d4', dotClass: 'bg-cyan-500' },
  { id: 'testing', label: 'Testing', color: '#ec4899', dotClass: 'bg-pink-500' },
  { id: 'pending', label: 'Pending', color: '#f59e0b', dotClass: 'bg-amber-500' },
  { id: 'backlog', label: 'Backlog', color: '#8b5cf6', dotClass: 'bg-purple-500' },
  { id: 'close',   label: 'Closed',  color: '#64748b', dotClass: 'bg-slate-500' },
];

export function getEffectiveStatus(issue, customStatusesMap = {}) {
  const key = `${issue.project_id}_${issue.iid}`;
  const custom = customStatusesMap[key];
  if (custom) return custom;
  return issue.state === 'closed' ? 'close' : 'open';
}

// ── Default Global Labels ─────────────────────────────────────────────────────
export const DEFAULT_GLOBAL_LABELS = [
  { id: 'gl-bug',     name: 'Bug',           color: '#ef4444', description: 'Defects or unexpected issues' },
  { id: 'gl-feat',    name: 'Feature',       color: '#3b82f6', description: 'New feature development' },
  { id: 'gl-urgent',  name: 'Urgent',        color: '#f59e0b', description: 'High priority / blocker' },
  { id: 'gl-polish',  name: 'Improvement',   color: '#8b5cf6', description: 'Refinement, polish, refactor' },
  { id: 'gl-docs',    name: 'Documentation', color: '#10b981', description: 'Docs and guides' },
  { id: 'gl-review',  name: 'Review',        color: '#ec4899', description: 'Code or design review needed' },
];

// ── safe JSON helpers ─────────────────────────────────────────────────────────
function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

// ── Default settings ──────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  autoAssignOnCreate: false,
  timeFormat: 'relative',   // 'relative' | 'absolute'
  clockFormat: '12h',       // '12h' | '24h'
  dateFormat: 'MMM d, yyyy', // 'MMM d, yyyy' | 'yyyy-MM-dd' | 'dd/MM/yyyy'
  retentionDays: 30,        // days before pruning closed issues
  compactTable: false,
  defaultFilterProjects: [], // string project IDs
  defaultFilterStatus: [],   // multi-select: array of status IDs e.g. ['open', 'ongoing'] or [] for all
  defaultFilterLabels: [],   // string label names
  accentColor: '#10b981',    // custom accent color hex
};

// ── Accent Color Applicator ───────────────────────────────────────────────────
export function applyAccentColor(hex) {
  if (!hex || typeof hex !== 'string') return;
  const clean = hex.startsWith('#') ? hex : `#${hex}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(clean)) return;

  const root = document.documentElement;
  root.style.setProperty('--accent', clean);
  root.style.setProperty('--accent-hover', clean);
  root.style.setProperty('--accent-muted', `${clean}1f`);
  root.style.setProperty('--accent-glow', `0 0 14px ${clean}33`);
}

// ── Public API ─────────────────────────────────────────────────────────────────
export const localStore = {
  // Issues
  getIssues:    ()       => get(KEYS.issues, []),
  setIssues:    (issues) => set(KEYS.issues, issues),

  // Projects
  getProjects:  ()         => get(KEYS.projects, []),
  setProjects:  (projects) => set(KEYS.projects, projects),

  // Last fetched timestamp
  getLastFetchedAt: () => get(KEYS.lastFetchedAt, null),
  setLastFetchedAt: (ts = Date.now()) => set(KEYS.lastFetchedAt, ts),
  hasEverFetched:   () => get(KEYS.lastFetchedAt, null) !== null,

  // Pinned tasks — stored as "projectId_iid" strings
  getPinned: () => new Set(get(KEYS.pinned, [])),
  setPinned: (pinned) => set(KEYS.pinned, [...pinned]),
  togglePin(projectId, iid) {
    const key    = `${projectId}_${iid}`;
    const pinned = this.getPinned();
    pinned.has(key) ? pinned.delete(key) : pinned.add(key);
    this.setPinned(pinned);
    return pinned;
  },
  isPinned: (projectId, iid) => localStore.getPinned().has(`${projectId}_${iid}`),

  // Global Labels
  getGlobalLabels: () => {
    const saved = get(KEYS.globalLabels, null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      set(KEYS.globalLabels, DEFAULT_GLOBAL_LABELS);
      return DEFAULT_GLOBAL_LABELS;
    }
    return saved;
  },
  setGlobalLabels: (labels) => set(KEYS.globalLabels, labels),
  resetGlobalLabels: () => {
    set(KEYS.globalLabels, DEFAULT_GLOBAL_LABELS);
    return DEFAULT_GLOBAL_LABELS;
  },

  // Custom Statuses — stored as { "projectId_iid": "ongoing" | "testing" | "pending" | "backlog" | "open" | "close" }
  getCustomStatuses: () => get(KEYS.customStatuses, {}),
  setCustomStatuses: (map) => set(KEYS.customStatuses, map),
  setCustomStatus(projectId, iid, status) {
    const map = this.getCustomStatuses();
    const key = `${projectId}_${iid}`;
    map[key] = status;
    this.setCustomStatuses(map);
    return map;
  },
  deleteCustomStatus(projectId, iid) {
    const map = this.getCustomStatuses();
    const key = `${projectId}_${iid}`;
    delete map[key];
    this.setCustomStatuses(map);
    return map;
  },

  // App settings
  getSettings: () => {
    const raw = get(KEYS.settings, {});
    const merged = { ...DEFAULT_SETTINGS, ...raw };
    // Normalize defaultFilterStatus to array
    if (merged.defaultFilterStatus === 'all' || !merged.defaultFilterStatus) {
      merged.defaultFilterStatus = [];
    } else if (typeof merged.defaultFilterStatus === 'string') {
      merged.defaultFilterStatus = [merged.defaultFilterStatus];
    }
    return merged;
  },
  setSettings: (s) => set(KEYS.settings, s),
  updateSettings(patch) {
    const updated = { ...this.getSettings(), ...patch };
    this.setSettings(updated);
    return updated;
  },

  /**
   * Remove closed issues older than retentionDays (default 30) from an array.
   * Called on every page load so stale data never accumulates.
   */
  pruneStaleClosedIssues(issues) {
    const settings = this.getSettings();
    const days = settings.retentionDays || CLOSED_CUTOFF_DAYS;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return issues.filter((i) => {
      if (i.state !== 'closed') return true;
      const closedAt = new Date(i.closed_at || i.updated_at || 0).getTime();
      return closedAt >= cutoff;
    });
  },

  // Full wipe
  clear() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};


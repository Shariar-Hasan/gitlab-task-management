import { create } from 'zustand';
import { toast } from 'sonner';
import { storage, applyTheme, getSystemTheme, type GlobalLabel } from '../lib/utils';
import {
  localStore, applyAccentColor,
  type AppSettings, type ProjectOverride, type TemplateItem,
  type GlobalLabelDef, type BoardStatusConfig,
  type TableVisibleColumns, type BoardVisibleColumns,
  DEFAULT_TABLE_VISIBLE_COLUMNS, DEFAULT_BOARD_VISIBLE_COLUMNS,
} from '../lib/localStore';
import {
  validateConnection, fetchAllProjects, fetchAllIssues,
  fetchProjectLabels, fetchProjectMembers,
  createIssue, updateIssue, deleteIssue, closeIssue, reopenIssue, createLabel,
  uploadProjectFile,
  getOrCreateBackupProject, saveBackupFile, loadBackupFile, isBackupProject,
} from '../services/gitlabApi';

export interface StoreState {
  // Theme
  theme: string;
  initTheme: () => void;
  setTheme: (theme: string) => void;

  // Settings
  appSettings: AppSettings;
  updateAppSettings: (patch: Partial<AppSettings>) => void;

  // Cloud Backup & Sync
  cloudSyncStatus: 'idle' | 'syncing' | 'error' | 'success';
  cloudSyncError: string | null;
  cloudSyncLastSynced: string | null;
  syncToCloud: (options?: { silent?: boolean }) => Promise<{ success: boolean; error?: string }>;
  restoreFromCloud: () => Promise<{ success: boolean; error?: string }>;
  triggerAutoSync: () => void;

  // Project Overrides
  projectOverrides: Record<string, ProjectOverride>;
  updateProjectOverride: (projectId: string | number, patch: Partial<ProjectOverride>) => void;
  getProjectDisplayName: (project: any) => string;
  isProjectEnabled: (projectId: string | number) => boolean;

  // Description Templates
  templates: TemplateItem[];
  updateTemplates: (templates: TemplateItem[]) => void;
  resetTemplates: () => void;

  // Global Labels
  globalLabels: GlobalLabelDef[];
  addGlobalLabel: (newLabel: { name: string; color?: string; description?: string }) => GlobalLabelDef;
  updateGlobalLabel: (id: string, patch: Partial<GlobalLabelDef>) => void;
  deleteGlobalLabel: (id: string) => void;
  resetGlobalLabels: () => void;

  // Auth
  instanceUrl: string;
  token: string;
  currentUser: any;
  isAuthenticated: boolean;
  authError: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (instanceUrl: string, token: string) => Promise<{ success: boolean; user?: any; error?: string }>;
  testConnection: (instanceUrl: string, token: string, options?: { silent?: boolean }) => Promise<{ success: boolean; user?: any; error?: string }>;
  logout: () => Promise<void>;

  // Projects
  projects: any[];
  projectsLoading: boolean;
  projectsError: string | null;
  fetchProjects: (options?: { force?: boolean }) => Promise<any[]>;
  readonly enabledProjects: any[];

  // Issues
  issues: any[];
  issuesLoading: boolean;
  issuesError: string | null;
  loadingProgress: number;
  lastFetchedAt: number | null;
  initializeData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  fetchAllIssues: (projectIds: Array<string | number>, options?: { force?: boolean }) => Promise<void>;

  _updateIssueInStore: (projectId: string | number, issueIid: string | number, updater: (i: any) => any) => void;
  _addIssueToStore: (issue: any) => void;
  _removeIssueFromStore: (projectId: string | number, issueIid: string | number) => void;

  // Task CRUD
  createTask: (projectId: string | number, payload: any) => Promise<any>;
  uploadFileToProject: (projectId: string | number, file: File) => Promise<any>;
  updateTask: (projectId: string | number, issueIid: string | number, payload: any) => Promise<any>;
  moveTask: (oldProjectId: string | number, issueIid: string | number, newProjectId: string | number, payloadOverride?: any) => Promise<any>;
  deleteTask: (projectId: string | number, issueIid: string | number, options?: { withUndo?: boolean }) => Promise<void>;
  toggleTaskState: (projectId: string | number, issueIid: string | number, currentState: string) => Promise<void>;
  bulkCloseIssues: (items: Array<{ projectId: string | number; issueIid: string | number; state: string }>) => Promise<void>;
  bulkAssignToMe: (items: Array<{ projectId: string | number; issueIid: string | number }>) => Promise<void>;
  bulkReopenIssues: (items: Array<{ projectId: string | number; issueIid: string | number }>) => Promise<void>;

  // Labels
  labelsByProject: Record<string, any[]>;
  labelsLoading: boolean;
  fetchLabelsForProject: (projectId: string | number) => Promise<any[]>;
  createProjectLabel: (projectId: string | number, payload: { name: string; color: string }) => Promise<any>;
  toggleIssueGlobalLabel: (issue: any, globalLabel: GlobalLabelDef | GlobalLabel) => Promise<void>;
  batchUpdateIssueGlobalLabels: (issue: any, nextLabels: any[]) => Promise<void>;

  // Members
  membersByProject: Record<string, any[]>;
  fetchMembersForProject: (projectId: string | number) => Promise<any[]>;

  // Custom Statuses
  customStatuses: Record<string, string>;
  setTaskStatus: (projectId: string | number, iid: string | number, newStatus: string) => Promise<void>;

  // Board Statuses (Configured columns with colors & enable/disable)
  boardStatuses: BoardStatusConfig[];
  updateBoardStatus: (id: string, patch: Partial<BoardStatusConfig>) => void;
  addBoardStatus: (label: string, color: string) => void;
  deleteBoardStatus: (id: string) => void;
  resetBoardStatuses: () => void;

  // Task Manual Sequence (Custom ordering)
  taskSequence: string[];
  reorderTaskSequence: (draggedKey: string, targetKey: string | null, position?: 'before' | 'after', allKeys?: string[], forceSeed?: boolean) => void;
  setTaskSequence: (sequence: string[]) => void;

  // Visible Columns / Fields
  tableVisibleColumns: TableVisibleColumns;
  boardVisibleColumns: BoardVisibleColumns;
  setTableVisibleColumns: (cols: Partial<TableVisibleColumns>) => void;
  setBoardVisibleColumns: (cols: Partial<BoardVisibleColumns>) => void;
  toggleTableColumn: (col: keyof TableVisibleColumns) => void;
  toggleBoardColumn: (col: keyof BoardVisibleColumns) => void;
  resetTableVisibleColumns: () => void;
  resetBoardVisibleColumns: () => void;

  // Pinned Tasks
  pinnedKeys: Set<string>;
  togglePin: (projectId: string | number, iid: string | number) => void;
  isPinned: (projectId: string | number, iid: string | number) => boolean;

  // Version Check
  latestVersion: string | null;
  updateAvailable: boolean;
  checkForUpdate: (options?: { force?: boolean }) => Promise<void>;

  // UI State
  activeView: string;
  setActiveView: (v: string) => void;
  viewMode: string;
  setViewMode: (v: string) => void;
  globalFilter: string;
  setGlobalFilter: (v: string) => void;
  filterProjects: string[];
  setFilterProjects: (arr: string[]) => void;
  filterStatus: string[];
  setFilterStatus: (v: string | string[]) => void;
  filterLabels: string[];
  setFilterLabels: (arr: string[]) => void;
  assignedToMe: boolean;
  setAssignedToMe: (v: boolean) => void;
  _persistFilters: (patch: Record<string, any>) => void;
}

// Map of pending deletions for grace-period undo: key -> { timer, issue }
const pendingDeletions = new Map<string, { timer: any; issue: any }>();

// Debounced auto-sync timer for on_change cloud backup
let autoSyncTimer: any = null;
function requestDebouncedSync() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => {
    const state = useStore.getState();
    const settings = localStore.getSettings();
    if (state.isAuthenticated && settings.cloudSyncEnabled && settings.cloudSyncFrequency === 'on_change') {
      state.syncToCloud({ silent: true }).catch(() => {});
    }
  }, 3500);
}

// Periodic background check for 1h / 1d cloud backup
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useStore.getState();
    const curSettings = localStore.getSettings();
    if (state.isAuthenticated && curSettings.cloudSyncEnabled && curSettings.cloudSyncFrequency !== 'on_change') {
      const last = curSettings.cloudSyncLastSynced ? new Date(curSettings.cloudSyncLastSynced).getTime() : 0;
      const intervalMs = curSettings.cloudSyncFrequency === '1h' ? 3600000 : 86400000;
      if (Date.now() - last > intervalMs) {
        state.syncToCloud({ silent: true }).catch(() => {});
      }
    }
  }, 10 * 60 * 1000); // Check every 10 min
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pendingDeletions.forEach(({ timer, issue }) => {
      clearTimeout(timer);
      const state = useStore.getState();
      deleteIssue(state.instanceUrl, state.token, issue.project_id, issue.iid).catch(() => {});
    });
    pendingDeletions.clear();
  });
}

const useStore = create<StoreState>((set, get) => ({
  // ── Theme ──────────────────────────────────────────────────────────────────
  theme: 'dark',
  initTheme() {
    const saved     = localStorage.getItem('gtm_theme') || 'dark';
    const resolved  = saved === 'system' ? getSystemTheme() : saved;
    set({ theme: saved });
    applyTheme(resolved);
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (get().theme === 'system') applyTheme(getSystemTheme());
    });
  },
  setTheme(theme: string) {
    localStorage.setItem('gtm_theme', theme);
    applyTheme(theme === 'system' ? getSystemTheme() : theme);
    set({ theme });
  },

  // ── App Settings (stored in localStore) ───────────────────────────────────
  appSettings: localStore.getSettings(),
  updateAppSettings(patch: Partial<AppSettings>) {
    if (patch.accentColor) applyAccentColor(patch.accentColor);
    const updated = localStore.updateSettings(patch);
    set({ appSettings: updated });
    requestDebouncedSync();
  },

  // ── Cloud Backup & Sync ─────────────────────────────────────────────────────
  cloudSyncStatus: 'idle',
  cloudSyncError: null,
  cloudSyncLastSynced: localStore.getSettings().cloudSyncLastSynced || null,

  async syncToCloud(options?: { silent?: boolean }) {
    const { instanceUrl, token, currentUser, isAuthenticated } = get();
    if (!isAuthenticated || !token || !currentUser?.id) {
      return { success: false, error: 'User is not authenticated with GitLab' };
    }
    set({ cloudSyncStatus: 'syncing', cloudSyncError: null });
    try {
      const backupProject = await getOrCreateBackupProject(instanceUrl, token, currentUser);
      const backupData = localStore.exportDataForBackup();
      await saveBackupFile(
        instanceUrl,
        token,
        backupProject.id,
        backupProject.default_branch || 'main',
        backupData
      );
      const nowIso = new Date().toISOString();
      const updatedSettings = localStore.updateSettings({ cloudSyncLastSynced: nowIso });
      set({
        cloudSyncStatus: 'success',
        cloudSyncError: null,
        cloudSyncLastSynced: nowIso,
        appSettings: updatedSettings,
      });
      if (!options?.silent) {
        toast.success('Backup synced to GitLab cloud repository');
      }
      return { success: true };
    } catch (err: any) {
      set({ cloudSyncStatus: 'error', cloudSyncError: err.message });
      if (!options?.silent) {
        toast.error(`Cloud backup failed: ${err.message}`);
      }
      return { success: false, error: err.message };
    }
  },

  async restoreFromCloud() {
    const { instanceUrl, token, currentUser, isAuthenticated } = get();
    if (!isAuthenticated || !token || !currentUser?.id) {
      return { success: false, error: 'User is not authenticated with GitLab' };
    }
    set({ cloudSyncStatus: 'syncing', cloudSyncError: null });
    try {
      const backupProject = await getOrCreateBackupProject(instanceUrl, token, currentUser);
      const backupData = await loadBackupFile(
        instanceUrl,
        token,
        backupProject.id,
        backupProject.default_branch || 'main'
      );
      localStore.importDataFromBackup(backupData);

      const importedSettings = localStore.getSettings();
      const importedBoardStatuses = localStore.getBoardStatuses();
      const importedCustomStatuses = localStore.getCustomStatuses();
      const importedGlobalLabels = localStore.getGlobalLabels();
      const importedTemplates = localStore.getTemplates();
      const importedTaskSequence = localStore.getTaskSequence();
      const importedPinned = localStore.getPinned();
      const importedProjectOverrides = localStore.getProjectOverrides();
      const importedTableCols = localStore.getTableVisibleColumns();
      const importedBoardCols = localStore.getBoardVisibleColumns();

      if (importedSettings.accentColor) {
        applyAccentColor(importedSettings.accentColor);
      }

      set({
        appSettings: importedSettings,
        boardStatuses: importedBoardStatuses,
        customStatuses: importedCustomStatuses,
        globalLabels: importedGlobalLabels,
        templates: importedTemplates,
        taskSequence: importedTaskSequence,
        pinnedKeys: importedPinned,
        projectOverrides: importedProjectOverrides,
        tableVisibleColumns: importedTableCols,
        boardVisibleColumns: importedBoardCols,
        cloudSyncStatus: 'success',
        cloudSyncError: null,
        cloudSyncLastSynced: importedSettings.cloudSyncLastSynced || new Date().toISOString(),
      });

      toast.success('Settings & data restored from GitLab cloud');
      return { success: true };
    } catch (err: any) {
      set({ cloudSyncStatus: 'error', cloudSyncError: err.message });
      toast.error(`Restore failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  triggerAutoSync() {
    requestDebouncedSync();
  },

  // ── Project Overrides (custom names + enabled/disabled) ───────────────────
  projectOverrides: localStore.getProjectOverrides(),
  updateProjectOverride(projectId: string | number, patch: Partial<ProjectOverride>) {
    const map = localStore.updateProjectOverride(projectId, patch);
    set({ projectOverrides: { ...map } });
    requestDebouncedSync();
  },
  getProjectDisplayName(project: any): string {
    if (!project) return '';
    const override = get().projectOverrides[String(project.id)];
    return override?.customName || project.name;
  },
  isProjectEnabled(projectId: string | number): boolean {
    const override = get().projectOverrides[String(projectId)];
    return override?.enabled !== false; // default: enabled
  },

  // ── Description Templates ─────────────────────────────────────────────────
  templates: localStore.getTemplates(),
  updateTemplates(templates: TemplateItem[]) {
    localStore.setTemplates(templates);
    set({ templates });
    requestDebouncedSync();
  },
  resetTemplates() {
    const defaults = localStore.resetTemplates();
    set({ templates: defaults });
    requestDebouncedSync();
  },

  // ── Global Labels (persisted across all projects) ─────────────────────────
  globalLabels: localStore.getGlobalLabels(),
  addGlobalLabel(newLabel: { name: string; color?: string; description?: string }): GlobalLabelDef {
    const current = get().globalLabels;
    const name = newLabel.name.trim();
    if (current.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Label "${name}" already exists`);
    }
    const created: GlobalLabelDef = {
      id: `gl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      color: newLabel.color || '#3b82f6',
      description: newLabel.description || '',
    };
    const updated = [...current, created];
    localStore.setGlobalLabels(updated);
    set({ globalLabels: updated });
    requestDebouncedSync();
    return created;
  },
  updateGlobalLabel(id: string, patch: Partial<GlobalLabelDef>) {
    const updated = get().globalLabels.map((l) =>
      l.id === id ? { ...l, ...patch } : l
    );
    localStore.setGlobalLabels(updated);
    set({ globalLabels: updated });
    requestDebouncedSync();
  },
  deleteGlobalLabel(id: string) {
    const updated = get().globalLabels.filter((l) => l.id !== id);
    localStore.setGlobalLabels(updated);
    set({ globalLabels: updated });
    requestDebouncedSync();
  },
  resetGlobalLabels() {
    const defaults = localStore.resetGlobalLabels();
    set({ globalLabels: defaults });
    requestDebouncedSync();
  },

  // ── Auth ───────────────────────────────────────────────────────────────────
  instanceUrl: '',
  token: '',
  currentUser: null,
  isAuthenticated: false,
  authError: null,

  async loadSettings() {
    get().initTheme();
    // Load app settings and global labels from localStore
    const settings = localStore.getSettings();
    if (settings.accentColor) applyAccentColor(settings.accentColor);
    set({
      appSettings: settings,
      globalLabels: localStore.getGlobalLabels(),
      projectOverrides: localStore.getProjectOverrides(),
      templates: localStore.getTemplates(),
    });

    const result = await storage.get(['instanceUrl', 'token']);
    if (result.instanceUrl) set({ instanceUrl: result.instanceUrl });
    if (result.token)       set({ token: result.token });
    if (result.instanceUrl && result.token) {
      await get().testConnection(result.instanceUrl, result.token, { silent: true });
    }
  },

  async saveSettings(instanceUrl: string, token: string) {
    await storage.set({ instanceUrl, token });
    set({ instanceUrl, token });
    return get().testConnection(instanceUrl, token);
  },

  async testConnection(instanceUrl: string, token: string, { silent = false } = {}) {
    if (!silent) set({ authError: null });
    try {
      const user = await validateConnection(instanceUrl, token);
      set({ currentUser: user, isAuthenticated: true, authError: null });
      return { success: true, user };
    } catch (err: any) {
      set({ currentUser: null, isAuthenticated: false, authError: err.message });
      return { success: false, error: err.message };
    }
  },

  async logout() {
    await storage.set({ token: '' });
    localStore.clear();
    set({ token: '', currentUser: null, isAuthenticated: false, issues: [], projects: [] });
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  projects: [],
  projectsLoading: false,
  projectsError: null,

  async fetchProjects({ force = false } = {}): Promise<any[]> {
    const { instanceUrl, token } = get();
    set({ projectsLoading: true, projectsError: null });
    try {
      const all = await fetchAllProjects(instanceUrl, token, { force });
      const projects = (all || []).filter((p) => !isBackupProject(p));
      localStore.setProjects(projects);
      set({ projects, projectsLoading: false });
      return projects;
    } catch (err: any) {
      set({ projectsError: err.message, projectsLoading: false });
      return [];
    }
  },

  // Get enabled projects (filtered by overrides)
  get enabledProjects(): any[] {
    const { projects, projectOverrides } = get();
    return projects.filter((p) => {
      const override = projectOverrides[String(p.id)];
      return override?.enabled !== false;
    });
  },

  // ── Issues — localStorage-first strategy ───────────────────────────────────
  issues: [],
  issuesLoading: false,
  issuesError: null,
  loadingProgress: 0,
  lastFetchedAt: localStore.getLastFetchedAt(),

  /**
   * Initialize data on app start.
   * - Always prune stale closed issues (>30 days) from localStorage
   * - If localStorage has data → use it (no API call)
   * - If localStorage is empty (first ever load) → fetch from API
   */
  async initializeData() {
    const cachedProjects = localStore.getProjects().filter((p) => !isBackupProject(p));
    const rawIssues      = localStore.getIssues();
    const hasData        = localStore.hasEverFetched();

    // Always prune stale closed issues on every page load
    const pruned = localStore.pruneStaleClosedIssues(rawIssues);
    if (pruned.length !== rawIssues.length) {
      localStore.setIssues(pruned);
    }

    const settings = localStore.getSettings();

    // Check scheduled cloud backup if interval elapsed
    if (settings.cloudSyncEnabled && settings.cloudSyncFrequency !== 'on_change') {
      const last = settings.cloudSyncLastSynced ? new Date(settings.cloudSyncLastSynced).getTime() : 0;
      const intervalMs = settings.cloudSyncFrequency === '1h' ? 3600000 : 86400000;
      if (Date.now() - last > intervalMs) {
        get().syncToCloud({ silent: true }).catch(() => {});
      }
    }

    // Load persistent filters if enabled
    let filterState = {
      filterProjects: settings.defaultFilterProjects || [],
      filterStatus: Array.isArray(settings.defaultFilterStatus) ? settings.defaultFilterStatus : [],
      filterLabels: settings.defaultFilterLabels || [],
      assignedToMe: false,
      globalFilter: '',
    };
    if (settings.persistFilters !== false) {
      const saved = localStore.getActiveFilters();
      if (saved) filterState = { ...filterState, ...saved };
    }

    if (hasData && cachedProjects.length > 0) {
      // Use cached data — no API call
      set({
        projects: cachedProjects,
        issues: pruned,
        lastFetchedAt: localStore.getLastFetchedAt(),
        filterProjects: filterState.filterProjects,
        filterStatus: filterState.filterStatus,
        filterLabels: filterState.filterLabels,
        assignedToMe: filterState.assignedToMe || false,
        globalFilter: filterState.globalFilter || '',
      });
      return;
    }

    // First ever load → fetch fresh data
    await get().refreshAll();
    set({
      filterProjects: filterState.filterProjects,
      filterStatus: filterState.filterStatus,
      filterLabels: filterState.filterLabels,
      assignedToMe: filterState.assignedToMe || false,
      globalFilter: filterState.globalFilter || '',
    });
  },

  /**
   * Force-refresh: fetch from API, overwrite localStorage.
   */
  async refreshAll() {
    const projects = await get().fetchProjects({ force: true });
    if (projects.length > 0) {
      const enabledIds = projects
        .filter((p) => {
          const override = get().projectOverrides[String(p.id)];
          return override?.enabled !== false;
        })
        .map((p) => p.id);
      await get().fetchAllIssues(enabledIds.length > 0 ? enabledIds : projects.map((p) => p.id), { force: true });
    }
  },

  async fetchAllIssues(projectIds: Array<string | number>, { force = false } = {}) {
    const { instanceUrl, token } = get();
    set({ issuesLoading: true, issuesError: null, loadingProgress: 0 });
    try {
      const issues = await fetchAllIssues(
        instanceUrl, token, projectIds,
        (pct) => set({ loadingProgress: pct }),
        { force }
      );
      const pruned = localStore.pruneStaleClosedIssues(issues);
      localStore.setIssues(pruned);
      localStore.setLastFetchedAt();
      set({ issues: pruned, issuesLoading: false, loadingProgress: 100, lastFetchedAt: Date.now() });
    } catch (err: any) {
      set({ issuesError: err.message, issuesLoading: false });
    }
  },

  // ── Optimistic updates ─────────────────────────────────────────────────────
  _updateIssueInStore(projectId: string | number, issueIid: string | number, updater: (i: any) => any) {
    set((s) => {
      const updated = s.issues.map((i) =>
        i.project_id === projectId && i.iid === issueIid ? updater(i) : i
      );
      localStore.setIssues(updated);
      return { issues: updated };
    });
  },

  _addIssueToStore(issue: any) {
    set((s) => {
      const updated = [issue, ...s.issues];
      localStore.setIssues(updated);
      return { issues: updated };
    });
  },

  _removeIssueFromStore(projectId: string | number, issueIid: string | number) {
    set((s) => {
      const updated = s.issues.filter((i) => !(i.project_id === projectId && i.iid === issueIid));
      localStore.setIssues(updated);
      return { issues: updated };
    });
  },

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  async createTask(projectId: string | number, payload: any): Promise<any> {
    const { instanceUrl, token, currentUser, appSettings, globalLabels } = get();
    // Auto-assign if setting is on
    if (appSettings.autoAssignOnCreate && currentUser) {
      payload = { ...payload, assignee_ids: [currentUser.id] };
    }

    // Ensure any selected global labels exist in the GitLab project
    if (payload.labels) {
      const labelNames = Array.isArray(payload.labels)
        ? payload.labels.map((l: any) => (typeof l === 'string' ? l : l.name))
        : String(payload.labels).split(',').map((s) => s.trim()).filter(Boolean);

      try {
        const projectLabels = await get().fetchLabelsForProject(projectId);
        for (const name of labelNames) {
          const matchedGlobal = globalLabels.find((g) => g.name.toLowerCase() === name.toLowerCase());
          const exists = projectLabels.some((pl) => pl.name.toLowerCase() === name.toLowerCase());
          if (!exists && matchedGlobal) {
            try {
              await get().createProjectLabel(projectId, {
                name: matchedGlobal.name,
                color: matchedGlobal.color,
              });
            } catch (err) {
              console.warn('Could not auto-create label in project:', err);
            }
          }
        }
      } catch (err) {
        console.warn('Failed label check on create:', err);
      }

      payload = {
        ...payload,
        labels: labelNames.join(','),
      };
    }

    const issue = await createIssue(instanceUrl, token, projectId, payload);
    get()._addIssueToStore(issue);
    return issue;
  },

  async uploadFileToProject(projectId: string | number, file: File): Promise<any> {
    const { instanceUrl, token, projects } = get();
    const currentProject = projects.find((p) => String(p.id) === String(projectId));
    const projectPath = currentProject?.path_with_namespace || currentProject?.name || '';
    return uploadProjectFile(instanceUrl, token, projectId, file, projectPath);
  },

  async updateTask(projectId: string | number, issueIid: string | number, payload: any): Promise<any> {
    const { instanceUrl, token } = get();
    get()._updateIssueInStore(projectId, issueIid, (i) => ({ ...i, ...payload }));
    try {
      const updated = await updateIssue(instanceUrl, token, projectId, issueIid, payload);
      get()._updateIssueInStore(projectId, issueIid, () => updated);
      return updated;
    } catch (err) {
      await get().initializeData();
      throw err;
    }
  },

  // Move task to a different project (create in new, delete from old)
  async moveTask(oldProjectId: string | number, issueIid: string | number, newProjectId: string | number, payloadOverride?: any): Promise<any> {
    const { issues } = get();
    const issue = issues.find((i) => i.project_id === oldProjectId && i.iid === issueIid);
    if (!issue && !payloadOverride) throw new Error('Issue not found');

    // Create in new project (use payloadOverride if given, e.g. updated title/description/assignees)
    const payload = payloadOverride || {
      title: issue.title,
      description: issue.description || '',
      due_date: issue.due_date || null,
      labels: (issue.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name)).join(','),
      assignee_ids: (issue.assignees || []).map((a: any) => a.id),
    };
    const { instanceUrl, token } = get();
    const newIssue = await createIssue(instanceUrl, token, newProjectId, payload);
    get()._addIssueToStore(newIssue);

    // Close/delete the old one
    try {
      await closeIssue(instanceUrl, token, oldProjectId, issueIid);
    } catch {}
    get()._removeIssueFromStore(oldProjectId, issueIid);

    return newIssue;
  },

  async deleteTask(projectId: string | number, issueIid: string | number, { withUndo = true }: { withUndo?: boolean } = {}): Promise<void> {
    const { instanceUrl, token, issues, appSettings } = get();
    const key = `${projectId}_${issueIid}`;
    const issue = issues.find((i) => String(i.project_id) === String(projectId) && String(i.iid) === String(issueIid));
    const undoPeriod = appSettings.undoPeriod !== undefined ? appSettings.undoPeriod : 5;

    get()._removeIssueFromStore(projectId, issueIid);
    localStore.deleteCustomStatus(projectId, issueIid);
    if (get().pinnedKeys.has(key)) {
      get().togglePin(projectId, issueIid);
    }

    if (!withUndo || undoPeriod <= 0 || !issue) {
      try {
        await deleteIssue(instanceUrl, token, projectId, issueIid);
        toast.success(issue ? `Deleted "${issue.title}"` : 'Task deleted');
      } catch (err) {
        await get().initializeData();
        throw err;
      }
      return;
    }

    // Schedule API deletion after grace period
    const timer = setTimeout(async () => {
      pendingDeletions.delete(key);
      try {
        await deleteIssue(instanceUrl, token, projectId, issueIid);
      } catch (err) {
        console.error('Failed to permanently delete task from GitLab:', err);
      }
    }, undoPeriod * 1000);

    pendingDeletions.set(key, { timer, issue });

    toast.success(`Deleted "${issue.title}"`, {
      duration: undoPeriod * 1000,
      action: {
        label: 'Undo',
        onClick: () => {
          const pending = pendingDeletions.get(key);
          if (pending) {
            clearTimeout(pending.timer);
            pendingDeletions.delete(key);
            get()._addIssueToStore(pending.issue);
            toast.info(`Restored "${pending.issue.title}"`);
          }
        },
      },
    });
  },

  async toggleTaskState(projectId: string | number, issueIid: string | number, currentState: string): Promise<void> {
    const { instanceUrl, token } = get();
    get()._updateIssueInStore(projectId, issueIid, (i) => ({
      ...i, state: currentState === 'opened' ? 'closed' : 'opened',
    }));
    try {
      const updated = currentState === 'opened'
        ? await closeIssue(instanceUrl, token, projectId, issueIid)
        : await reopenIssue(instanceUrl, token, projectId, issueIid);
      // If now closed and older than 30d → remove; else update
      const closedAt  = new Date(updated.closed_at || updated.updated_at || 0).getTime();
      const cutoff    = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (updated.state === 'closed' && closedAt < cutoff) {
        get()._removeIssueFromStore(projectId, issueIid);
      } else {
        get()._updateIssueInStore(projectId, issueIid, () => updated);
      }
    } catch (err) { await get().initializeData(); throw err; }
  },

  // Bulk close
  async bulkCloseIssues(items: Array<{ projectId: string | number; issueIid: string | number; state: string }>): Promise<void> {
    const { instanceUrl, token } = get();
    await Promise.allSettled(
      items.map(({ projectId, issueIid, state }) =>
        state === 'opened' ? closeIssue(instanceUrl, token, projectId, issueIid) : null
      )
    );
    items.forEach(({ projectId, issueIid, state }) => {
      if (state === 'opened') {
        get()._updateIssueInStore(projectId, issueIid, (i) => ({ ...i, state: 'closed' }));
      }
    });
  },

  // Bulk assign to current user
  async bulkAssignToMe(items: Array<{ projectId: string | number; issueIid: string | number }>): Promise<void> {
    const { instanceUrl, token, currentUser } = get();
    if (!currentUser) return;
    await Promise.allSettled(
      items.map(({ projectId, issueIid }) =>
        updateIssue(instanceUrl, token, projectId, issueIid, { assignee_ids: [currentUser.id] })
      )
    );
    items.forEach(({ projectId, issueIid }) => {
      get()._updateIssueInStore(projectId, issueIid, (i) => ({
        ...i,
        assignees: [{ ...currentUser, avatar_url: currentUser.avatar_url }],
      }));
    });
  },

  // Bulk reopen
  async bulkReopenIssues(items: Array<{ projectId: string | number; issueIid: string | number }>): Promise<void> {
    const { instanceUrl, token } = get();
    await Promise.allSettled(
      items.map(({ projectId, issueIid }) =>
        reopenIssue(instanceUrl, token, projectId, issueIid)
      )
    );
    items.forEach(({ projectId, issueIid }) => {
      get()._updateIssueInStore(projectId, issueIid, (i) => ({ ...i, state: 'opened' }));
    });
  },

  // ── Labels ─────────────────────────────────────────────────────────────────
  labelsByProject: {},
  labelsLoading: false,

  async fetchLabelsForProject(projectId: string | number): Promise<any[]> {
    if (get().labelsByProject[String(projectId)]) return get().labelsByProject[String(projectId)];
    const { instanceUrl, token } = get();
    set({ labelsLoading: true });
    try {
      const labels = await fetchProjectLabels(instanceUrl, token, projectId);
      set((s) => ({ labelsByProject: { ...s.labelsByProject, [String(projectId)]: labels }, labelsLoading: false }));
      return labels;
    } catch { set({ labelsLoading: false }); return []; }
  },

  async createProjectLabel(projectId: string | number, payload: { name: string; color: string }): Promise<any> {
    const { instanceUrl, token } = get();
    try {
      const label = await createLabel(instanceUrl, token, projectId, payload);
      set((s) => ({
        labelsByProject: {
          ...s.labelsByProject,
          [String(projectId)]: [...(s.labelsByProject[String(projectId)] || []), label],
        },
      }));
      return label;
    } catch (err) {
      // If label already exists (409) or other non-fatal error, return dummy with requested name & color
      return { name: payload.name, color: payload.color };
    }
  },

  /**
   * Toggles assignment of a global label to a task:
   * - If task currently has label: removes it on GitLab and locally.
   * - If task does NOT have label:
   *   1. Checks if project has label in GitLab; if not, creates it in project!
   *   2. Assigns label to issue on GitLab and locally.
   */
  async toggleIssueGlobalLabel(issue: any, globalLabel: GlobalLabelDef | GlobalLabel): Promise<void> {
    const { instanceUrl, token } = get();
    const projectId = issue.project_id;
    const issueIid  = issue.iid;

    const rawLabels = issue.labels || [];
    const hasLabel = rawLabels.some((l: any) => {
      const name = typeof l === 'string' ? l : l?.name;
      return name?.toLowerCase() === globalLabel.name.toLowerCase();
    });

    if (hasLabel) {
      // ── REMOVE ──
      const newLabels = rawLabels.filter((l: any) => {
        const name = typeof l === 'string' ? l : l?.name;
        return name?.toLowerCase() !== globalLabel.name.toLowerCase();
      });
      get()._updateIssueInStore(projectId, issueIid, (i) => ({ ...i, labels: newLabels }));

      try {
        await updateIssue(instanceUrl, token, projectId, issueIid, {
          remove_labels: globalLabel.name,
        });
      } catch (err) {
        console.error('Failed to remove label on GitLab:', err);
        await get().initializeData();
        throw err;
      }
    } else {
      // ── ASSIGN ──
      // 1. Ensure project has this label
      try {
        const projectLabels = await get().fetchLabelsForProject(projectId);
        const existsInProject = projectLabels.some(
          (pl: any) => pl.name.toLowerCase() === globalLabel.name.toLowerCase()
        );
        if (!existsInProject) {
          await get().createProjectLabel(projectId, {
            name: globalLabel.name,
            color: globalLabel.color || '#3b82f6',
          });
        }
      } catch (err) {
        console.warn('Could not verify/create label in project:', err);
      }

      // 2. Optimistic update
      const newLabels = [...rawLabels, { name: globalLabel.name, color: globalLabel.color }];
      get()._updateIssueInStore(projectId, issueIid, (i) => ({ ...i, labels: newLabels }));

      // 3. API update: add_labels
      try {
        await updateIssue(instanceUrl, token, projectId, issueIid, {
          add_labels: globalLabel.name,
        });
      } catch (err) {
        console.error('Failed to assign label on GitLab:', err);
        await get().initializeData();
        throw err;
      }
    }
  },

  // ── Batch Label Update (updates after label popover closes) ────────────────
  async batchUpdateIssueGlobalLabels(issue: any, nextLabels: any[]): Promise<void> {
    const { instanceUrl, token } = get();
    const projectId = issue.project_id;
    const issueIid  = issue.iid;
    const allGlobal = get().globalLabels;

    try {
      // Ensure all selected global labels exist in this project on GitLab
      for (const gl of nextLabels) {
        const pLabels = await get().fetchLabelsForProject(projectId);
        const exists = pLabels.some((l: any) => l.name.toLowerCase() === gl.name.toLowerCase());
        if (!exists) {
          await get().createProjectLabel(projectId, { name: gl.name, color: gl.color });
        }
      }

      // Preserve non-global labels on the issue
      const rawLabels = issue.labels || [];
      const nonGlobalLabels = rawLabels.filter((l: any) => {
        const name = typeof l === 'string' ? l : l?.name;
        return !allGlobal.some((g) => g.name.toLowerCase() === name?.toLowerCase());
      });

      const finalLabels = [...nonGlobalLabels, ...nextLabels];
      const labelNames  = finalLabels.map((l: any) => (typeof l === 'string' ? l : l.name)).join(',');

      await updateIssue(instanceUrl, token, projectId, issueIid, { labels: labelNames });

      const updatedIssues = get().issues.map((i) =>
        i.project_id === projectId && i.iid === issueIid ? { ...i, labels: finalLabels } : i
      );
      localStore.setIssues(updatedIssues);
      set({ issues: updatedIssues });
    } catch (err) {
      console.error('Failed to batch update labels on GitLab:', err);
      throw err;
    }
  },

  // ── Members ────────────────────────────────────────────────────────────────
  membersByProject: {},

  async fetchMembersForProject(projectId: string | number): Promise<any[]> {
    if (get().membersByProject[String(projectId)]) return get().membersByProject[String(projectId)];
    const { instanceUrl, token } = get();
    try {
      const members = await fetchProjectMembers(instanceUrl, token, projectId);
      set((s) => ({ membersByProject: { ...s.membersByProject, [String(projectId)]: members } }));
      return members;
    } catch { return []; }
  },

  // ── Custom Statuses (open & close sync with GitLab; others local) ───────────
  customStatuses: localStore.getCustomStatuses(),

  // ── Board Statuses (configured columns with colors & enable/disable) ───────
  boardStatuses: localStore.getBoardStatuses(),

  updateBoardStatus(id: string, patch: Partial<BoardStatusConfig>) {
    const list = localStore.updateBoardStatus(id, patch);
    set({ boardStatuses: [...list] });
    requestDebouncedSync();
  },

  addBoardStatus(label: string, color: string) {
    const list = localStore.addBoardStatus(label, color);
    set({ boardStatuses: [...list] });
    requestDebouncedSync();
  },

  deleteBoardStatus(id: string) {
    const list = localStore.deleteBoardStatus(id);
    set({ boardStatuses: [...list] });
    requestDebouncedSync();
  },

  resetBoardStatuses() {
    const list = localStore.resetBoardStatuses();
    set({ boardStatuses: [...list] });
    requestDebouncedSync();
  },

  // Task Sequence
  taskSequence: localStore.getTaskSequence(),

  reorderTaskSequence(draggedKey: string, targetKey: string | null, position: 'before' | 'after' = 'before', allKeys?: string[], forceSeed = false) {
    const updated = localStore.reorderTask(draggedKey, targetKey, position, allKeys, forceSeed);
    set({ taskSequence: [...updated] });
    requestDebouncedSync();
  },

  setTaskSequence(sequence: string[]) {
    const updated = localStore.setTaskSequence(sequence);
    set({ taskSequence: [...updated] });
    requestDebouncedSync();
  },

  // Visible Columns
  tableVisibleColumns: localStore.getTableVisibleColumns(),
  boardVisibleColumns: localStore.getBoardVisibleColumns(),

  setTableVisibleColumns(cols: Partial<TableVisibleColumns>) {
    const updated = localStore.setTableVisibleColumns(cols);
    set({ tableVisibleColumns: { ...updated } });
    requestDebouncedSync();
  },

  setBoardVisibleColumns(cols: Partial<BoardVisibleColumns>) {
    const updated = localStore.setBoardVisibleColumns(cols);
    set({ boardVisibleColumns: { ...updated } });
    requestDebouncedSync();
  },

  toggleTableColumn(col: keyof TableVisibleColumns) {
    const current = get().tableVisibleColumns;
    const updated = localStore.setTableVisibleColumns({ [col]: !current[col] });
    set({ tableVisibleColumns: { ...updated } });
    requestDebouncedSync();
  },

  toggleBoardColumn(col: keyof BoardVisibleColumns) {
    const current = get().boardVisibleColumns;
    const updated = localStore.setBoardVisibleColumns({ [col]: !current[col] });
    set({ boardVisibleColumns: { ...updated } });
    requestDebouncedSync();
  },

  resetTableVisibleColumns() {
    const updated = localStore.setTableVisibleColumns(DEFAULT_TABLE_VISIBLE_COLUMNS);
    set({ tableVisibleColumns: { ...updated } });
    requestDebouncedSync();
  },

  resetBoardVisibleColumns() {
    const updated = localStore.setBoardVisibleColumns(DEFAULT_BOARD_VISIBLE_COLUMNS);
    set({ boardVisibleColumns: { ...updated } });
    requestDebouncedSync();
  },

  async setTaskStatus(projectId: string | number, iid: string | number, newStatus: string): Promise<void> {
    const { instanceUrl, token, issues } = get();
    const map = localStore.setCustomStatus(projectId, iid, newStatus);
    set({ customStatuses: { ...map } });
    requestDebouncedSync();

    const issue = issues.find((i) => i.project_id === projectId && i.iid === iid);
    if (!issue) return;

    if (newStatus === 'close') {
      if (issue.state !== 'closed') {
        try {
          await closeIssue(instanceUrl, token, projectId, iid);
          const updated = issues.map((i) =>
            i.project_id === projectId && i.iid === iid
              ? { ...i, state: 'closed', closed_at: new Date().toISOString() }
              : i
          );
          localStore.setIssues(updated);
          set({ issues: updated });
        } catch (e) {
          console.error('Failed to close issue on GitLab:', e);
        }
      }
    } else {
      if (issue.state === 'closed') {
        try {
          await reopenIssue(instanceUrl, token, projectId, iid);
          const updated = issues.map((i) =>
            i.project_id === projectId && i.iid === iid
              ? { ...i, state: 'opened', closed_at: null }
              : i
          );
          localStore.setIssues(updated);
          set({ issues: updated });
        } catch (e) {
          console.error('Failed to reopen issue on GitLab:', e);
        }
      }
    }
  },

  // ── Pinned Tasks ───────────────────────────────────────────────────────────
  pinnedKeys: localStore.getPinned(), // Set of "projectId_iid"

  togglePin(projectId: string | number, iid: string | number) {
    const pinned = localStore.togglePin(projectId, iid);
    set({ pinnedKeys: new Set(pinned) });
    requestDebouncedSync();
  },
  isPinned: (projectId: string | number, iid: string | number): boolean => get().pinnedKeys.has(`${projectId}_${iid}`),

  // ── Version Check ──────────────────────────────────────────────────────────
  latestVersion: localStore.getLatestVersion(),
  updateAvailable: false,

  async checkForUpdate(options: { force?: boolean } = {}): Promise<void> {
    const { appSettings } = get();
    const repo = appSettings.githubRepo || 'Shariar-Hasan/gitlab-task-management';
    const lastCheck = localStore.getLastUpdateCheck();
    const hours = appSettings.updateCheckHours || 4;
    const msThreshold = hours * 60 * 60 * 1000;
    const currentVersion = '1.1.0'; // from manifest

    // 1. Check if background service worker stored an update result
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      try {
        const stored = await chrome.storage.local.get('extension_update_info');
        if (stored?.extension_update_info) {
          const info = stored.extension_update_info;
          set({
            latestVersion: info.latestVersion,
            updateAvailable: Boolean(info.updateAvailable),
          });
          if (!options.force) return;
        }
      } catch {}
    }

    // 2. Throttle checks unless forced
    if (!options.force && lastCheck && Date.now() - lastCheck < msThreshold) {
      const latest = localStore.getLatestVersion();
      if (latest) {
        const updateAvailable = isNewerVersion(latest, currentVersion);
        set({ latestVersion: latest, updateAvailable });
      }
      return;
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const tag = (data.tag_name || '').replace(/^v/, '');
      const updateAvailable = isNewerVersion(tag, currentVersion);
      localStore.setLatestVersion(tag);
      localStore.setLastUpdateCheck();
      set({ latestVersion: tag, updateAvailable });
    } catch (e) {
      console.warn('Version check failed:', e);
    }
  },

  // ── UI State ───────────────────────────────────────────────────────────────
  activeView: 'dashboard',
  setActiveView: (v: string) => set({ activeView: v }),

  viewMode: localStore.getSettings()?.viewMode || 'table', // 'table' | 'board'
  setViewMode: (v: string) => {
    set({ viewMode: v });
    localStore.updateSettings({ viewMode: v });
  },

  globalFilter: (localStore.getSettings()?.persistFilters !== false ? localStore.getActiveFilters()?.globalFilter : '') || '',
  setGlobalFilter: (v: string) => {
    set({ globalFilter: v });
    get()._persistFilters({ globalFilter: v });
  },

  // Multi-select filters
  filterProjects: (localStore.getSettings()?.persistFilters !== false && localStore.getActiveFilters()?.filterProjects?.length)
    ? localStore.getActiveFilters().filterProjects
    : (localStore.getSettings()?.defaultFilterProjects || []),
  setFilterProjects: (arr: string[]) => {
    set({ filterProjects: arr || [] });
    get()._persistFilters({ filterProjects: arr || [] });
  },

  filterStatus: (localStore.getSettings()?.persistFilters !== false && localStore.getActiveFilters()?.filterStatus?.length)
    ? localStore.getActiveFilters().filterStatus
    : (Array.isArray(localStore.getSettings()?.defaultFilterStatus) ? localStore.getSettings().defaultFilterStatus : []),
  setFilterStatus: (v: string | string[]) => {
    const val = Array.isArray(v) ? v : (v && v !== 'all' ? [v] : []);
    set({ filterStatus: val });
    get()._persistFilters({ filterStatus: val });
  },

  filterLabels: (localStore.getSettings()?.persistFilters !== false && localStore.getActiveFilters()?.filterLabels?.length)
    ? localStore.getActiveFilters().filterLabels
    : (localStore.getSettings()?.defaultFilterLabels || []),
  setFilterLabels: (arr: string[]) => {
    set({ filterLabels: arr || [] });
    get()._persistFilters({ filterLabels: arr || [] });
  },

  assignedToMe: (localStore.getSettings()?.persistFilters !== false && Boolean(localStore.getActiveFilters()?.assignedToMe)) || false,
  setAssignedToMe: (v: boolean) => {
    set({ assignedToMe: v });
    get()._persistFilters({ assignedToMe: v });
  },

  // Persist active filters to localStorage
  _persistFilters(patch: Record<string, any>) {
    const settings = localStore.getSettings();
    if (settings.persistFilters === false) return;
    const current = localStore.getActiveFilters();
    localStore.setActiveFilters({ ...current, ...patch });
  },
}));

// Helper: compare semver strings
function isNewerVersion(latest: string, current: string): boolean {
  if (!latest || !current) return false;
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [lMaj, lMin, lPatch] = parse(latest);
  const [cMaj, cMin, cPatch] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return (lPatch || 0) > (cPatch || 0);
}

export default useStore;

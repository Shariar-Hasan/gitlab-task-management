import { create } from 'zustand';
import { storage, applyTheme, getSystemTheme } from '../lib/utils.js';
import { localStore, applyAccentColor } from '../lib/localStore.js';
import {
  validateConnection, fetchAllProjects, fetchAllIssues,
  fetchProjectLabels, fetchProjectMembers,
  createIssue, updateIssue, deleteIssue, closeIssue, reopenIssue, createLabel,
  uploadProjectFile,
} from '../services/gitlabApi.js';

const useStore = create((set, get) => ({
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
  setTheme(theme) {
    localStorage.setItem('gtm_theme', theme);
    applyTheme(theme === 'system' ? getSystemTheme() : theme);
    set({ theme });
  },

  // ── App Settings (stored in localStore) ───────────────────────────────────
  appSettings: localStore.getSettings(),
  updateAppSettings(patch) {
    if (patch.accentColor) applyAccentColor(patch.accentColor);
    const updated = localStore.updateSettings(patch);
    set({ appSettings: updated });
  },

  // ── Global Labels (persisted across all projects) ─────────────────────────
  globalLabels: localStore.getGlobalLabels(),
  addGlobalLabel(newLabel) {
    const current = get().globalLabels;
    const name = newLabel.name.trim();
    if (current.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Label "${name}" already exists`);
    }
    const created = {
      id: `gl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      color: newLabel.color || '#3b82f6',
      description: newLabel.description || '',
    };
    const updated = [...current, created];
    localStore.setGlobalLabels(updated);
    set({ globalLabels: updated });
    return created;
  },
  updateGlobalLabel(id, patch) {
    const updated = get().globalLabels.map((l) =>
      l.id === id ? { ...l, ...patch } : l
    );
    localStore.setGlobalLabels(updated);
    set({ globalLabels: updated });
  },
  deleteGlobalLabel(id) {
    const updated = get().globalLabels.filter((l) => l.id !== id);
    localStore.setGlobalLabels(updated);
    set({ globalLabels: updated });
  },
  resetGlobalLabels() {
    const defaults = localStore.resetGlobalLabels();
    set({ globalLabels: defaults });
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
    });

    const result = await storage.get(['instanceUrl', 'token']);
    if (result.instanceUrl) set({ instanceUrl: result.instanceUrl });
    if (result.token)       set({ token: result.token });
    if (result.instanceUrl && result.token) {
      await get().testConnection(result.instanceUrl, result.token, { silent: true });
    }
  },

  async saveSettings(instanceUrl, token) {
    await storage.set({ instanceUrl, token });
    set({ instanceUrl, token });
    return get().testConnection(instanceUrl, token);
  },

  async testConnection(instanceUrl, token, { silent = false } = {}) {
    if (!silent) set({ authError: null });
    try {
      const user = await validateConnection(instanceUrl, token);
      set({ currentUser: user, isAuthenticated: true, authError: null });
      return { success: true, user };
    } catch (err) {
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

  async fetchProjects({ force = false } = {}) {
    const { instanceUrl, token } = get();
    set({ projectsLoading: true, projectsError: null });
    try {
      const projects = await fetchAllProjects(instanceUrl, token, { force });
      localStore.setProjects(projects);
      set({ projects, projectsLoading: false });
      return projects;
    } catch (err) {
      set({ projectsError: err.message, projectsLoading: false });
      return [];
    }
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
    const cachedProjects = localStore.getProjects();
    const rawIssues      = localStore.getIssues();
    const hasData        = localStore.hasEverFetched();

    // Always prune stale closed issues on every page load
    const pruned = localStore.pruneStaleClosedIssues(rawIssues);
    if (pruned.length !== rawIssues.length) {
      localStore.setIssues(pruned);
    }

    const settings = localStore.getSettings();
    if (hasData && cachedProjects.length > 0) {
      // Use cached data — no API call
      set({
        projects: cachedProjects,
        issues: pruned,
        lastFetchedAt: localStore.getLastFetchedAt(),
        filterProjects: settings.defaultFilterProjects || [],
        filterStatus: Array.isArray(settings.defaultFilterStatus) ? settings.defaultFilterStatus : [],
        filterLabels: settings.defaultFilterLabels || [],
      });
      return;
    }

    // First ever load → fetch fresh data
    await get().refreshAll();
    set({
      filterProjects: settings.defaultFilterProjects || [],
      filterStatus: Array.isArray(settings.defaultFilterStatus) ? settings.defaultFilterStatus : [],
      filterLabels: settings.defaultFilterLabels || [],
    });
  },

  /**
   * Force-refresh: fetch from API, overwrite localStorage.
   */
  async refreshAll() {
    const projects = await get().fetchProjects({ force: true });
    if (projects.length > 0) {
      await get().fetchAllIssues(projects.map((p) => p.id), { force: true });
    }
  },

  async fetchAllIssues(projectIds, { force = false } = {}) {
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
    } catch (err) {
      set({ issuesError: err.message, issuesLoading: false });
    }
  },

  // ── Optimistic updates ─────────────────────────────────────────────────────
  _updateIssueInStore(projectId, issueIid, updater) {
    set((s) => {
      const updated = s.issues.map((i) =>
        i.project_id === projectId && i.iid === issueIid ? updater(i) : i
      );
      localStore.setIssues(updated);
      return { issues: updated };
    });
  },

  _addIssueToStore(issue) {
    set((s) => {
      const updated = [issue, ...s.issues];
      localStore.setIssues(updated);
      return { issues: updated };
    });
  },

  _removeIssueFromStore(projectId, issueIid) {
    set((s) => {
      const updated = s.issues.filter((i) => !(i.project_id === projectId && i.iid === issueIid));
      localStore.setIssues(updated);
      return { issues: updated };
    });
  },

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  async createTask(projectId, payload) {
    const { instanceUrl, token, currentUser, appSettings, globalLabels } = get();
    // Auto-assign if setting is on
    if (appSettings.autoAssignOnCreate && currentUser) {
      payload = { ...payload, assignee_ids: [currentUser.id] };
    }

    // Ensure any selected global labels exist in the GitLab project
    if (payload.labels) {
      const labelNames = Array.isArray(payload.labels)
        ? payload.labels.map((l) => (typeof l === 'string' ? l : l.name))
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

  async uploadFileToProject(projectId, file) {
    const { instanceUrl, token, projects } = get();
    const currentProject = projects.find((p) => String(p.id) === String(projectId));
    const projectPath = currentProject?.path_with_namespace || currentProject?.name || '';
    return uploadProjectFile(instanceUrl, token, projectId, file, projectPath);
  },

  async updateTask(projectId, issueIid, payload) {
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

  async deleteTask(projectId, issueIid) {
    const { instanceUrl, token } = get();
    get()._removeIssueFromStore(projectId, issueIid);
    localStore.deleteCustomStatus(projectId, issueIid);
    if (get().pinnedKeys.has(`${projectId}_${issueIid}`)) {
      get().togglePin(projectId, issueIid);
    }
    try { await deleteIssue(instanceUrl, token, projectId, issueIid); }
    catch (err) { await get().initializeData(); throw err; }
  },

  async toggleTaskState(projectId, issueIid, currentState) {
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
  async bulkCloseIssues(items) {
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
  async bulkAssignToMe(items) {
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

  // ── Labels ─────────────────────────────────────────────────────────────────
  labelsByProject: {},
  labelsLoading: false,

  async fetchLabelsForProject(projectId) {
    if (get().labelsByProject[projectId]) return get().labelsByProject[projectId];
    const { instanceUrl, token } = get();
    set({ labelsLoading: true });
    try {
      const labels = await fetchProjectLabels(instanceUrl, token, projectId);
      set((s) => ({ labelsByProject: { ...s.labelsByProject, [projectId]: labels }, labelsLoading: false }));
      return labels;
    } catch { set({ labelsLoading: false }); return []; }
  },

  async createProjectLabel(projectId, payload) {
    const { instanceUrl, token } = get();
    try {
      const label = await createLabel(instanceUrl, token, projectId, payload);
      set((s) => ({
        labelsByProject: {
          ...s.labelsByProject,
          [projectId]: [...(s.labelsByProject[projectId] || []), label],
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
  async toggleIssueGlobalLabel(issue, globalLabel) {
    const { instanceUrl, token } = get();
    const projectId = issue.project_id;
    const issueIid  = issue.iid;

    const rawLabels = issue.labels || [];
    const hasLabel = rawLabels.some((l) => {
      const name = typeof l === 'string' ? l : l?.name;
      return name?.toLowerCase() === globalLabel.name.toLowerCase();
    });

    if (hasLabel) {
      // ── REMOVE ──
      const newLabels = rawLabels.filter((l) => {
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
          (pl) => pl.name.toLowerCase() === globalLabel.name.toLowerCase()
        );
        if (!existsInProject) {
          await get().createProjectLabel(projectId, {
            name: globalLabel.name,
            color: globalLabel.color,
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
  async batchUpdateIssueGlobalLabels(issue, nextLabels) {
    const { instanceUrl, token } = get();
    const projectId = issue.project_id;
    const issueIid  = issue.iid;
    const allGlobal = get().globalLabels;

    try {
      // Ensure all selected global labels exist in this project on GitLab
      for (const gl of nextLabels) {
        const pLabels = await get().fetchLabelsForProject(projectId);
        const exists = pLabels.some((l) => l.name.toLowerCase() === gl.name.toLowerCase());
        if (!exists) {
          await get().createProjectLabel(projectId, { name: gl.name, color: gl.color });
        }
      }

      // Preserve non-global labels on the issue
      const rawLabels = issue.labels || [];
      const nonGlobalLabels = rawLabels.filter((l) => {
        const name = typeof l === 'string' ? l : l?.name;
        return !allGlobal.some((g) => g.name.toLowerCase() === name?.toLowerCase());
      });

      const finalLabels = [...nonGlobalLabels, ...nextLabels];
      const labelNames  = finalLabels.map((l) => (typeof l === 'string' ? l : l.name)).join(',');

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

  async fetchMembersForProject(projectId) {
    if (get().membersByProject[projectId]) return get().membersByProject[projectId];
    const { instanceUrl, token } = get();
    try {
      const members = await fetchProjectMembers(instanceUrl, token, projectId);
      set((s) => ({ membersByProject: { ...s.membersByProject, [projectId]: members } }));
      return members;
    } catch { return []; }
  },

  // ── Custom Statuses (open & close sync with GitLab; others local) ───────────
  customStatuses: localStore.getCustomStatuses(),

  async setTaskStatus(projectId, iid, newStatus) {
    const { instanceUrl, token, issues } = get();
    const map = localStore.setCustomStatus(projectId, iid, newStatus);
    set({ customStatuses: { ...map } });

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
    } else if (newStatus === 'open') {
      if (issue.state !== 'opened') {
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

  togglePin(projectId, iid) {
    const pinned = localStore.togglePin(projectId, iid);
    set({ pinnedKeys: new Set(pinned) });
  },
  isPinned: (projectId, iid) => get().pinnedKeys.has(`${projectId}_${iid}`),

  // ── UI State ───────────────────────────────────────────────────────────────
  activeView: 'dashboard',
  setActiveView: (v) => set({ activeView: v }),

  globalFilter: '',
  setGlobalFilter: (v) => set({ globalFilter: v }),

  // Multi-select filters
  filterProjects: localStore.getSettings()?.defaultFilterProjects || [],
  setFilterProjects: (arr) => set({ filterProjects: arr || [] }),

  filterStatus: Array.isArray(localStore.getSettings()?.defaultFilterStatus) ? localStore.getSettings().defaultFilterStatus : [],
  setFilterStatus: (v) => set({
    filterStatus: Array.isArray(v) ? v : (v && v !== 'all' ? [v] : [])
  }),

  filterLabels: localStore.getSettings()?.defaultFilterLabels || [],
  setFilterLabels: (arr) => set({ filterLabels: arr || [] }),
}));

export default useStore;

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  GitBranch, Search, Plus, Filter, RefreshCw, Settings,
  AlertCircle, X, BarChart3, CheckCircle2, Clock, Circle,
  FolderGit2, CircleDot, Tag, List, Kanban, User, Bell,
  ExternalLink, Keyboard, HelpCircle, Sparkles, Command,
} from 'lucide-react';
import {
  Button, Input, Spinner, ProgressBar, Skeleton,
  ThemeToggle, CacheStatus, FilterSelect,
} from './ui/index';
import { Modal } from './ui/overlay';
import TaskTable from './TaskTable';
import BoardView from './BoardView';
import TaskModal from './TaskModal';
import CommandPalette from './CommandPalette';
import StandupInsightsModal from './StandupInsightsModal';
import useStore from '../store/useStore';
import { cn } from '../lib/utils';
import { TASK_STATUSES, getEffectiveStatus } from '../lib/localStore';
import { useConfirm } from '../context/ConfirmContext';

interface StatCardProps {
  label: string;
  value: number;
  icon: any;
  colorClass: string;
  loading: boolean;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, loading }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] theme-transition">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', colorClass)} />
        <span className="text-[10px] text-[var(--text-3)] font-medium uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-10 rounded" />
      ) : (
        <span className="text-2xl font-bold text-[var(--text-1)]">{value.toLocaleString()}</span>
      )}
    </div>
  );
}

// ── Keyboard Shortcuts Modal ──────────────────────────────────────────────────
function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const shortcuts = [
    {
      category: 'Navigation & Views',
      items: [
        { keys: ['⌘K', 'or', 'Ctrl+K'], desc: 'Open Command Palette & Omnibar' },
        { keys: ['1', 'or', 'T'], desc: 'Switch to Table View' },
        { keys: ['2', 'or', 'B'], desc: 'Switch to Board (Kanban) View' },
        { keys: ['/'], desc: 'Focus search bar' },
        { keys: ['Esc'], desc: 'Close open dialogs or clear search' },
      ],
    },
    {
      category: 'Tasks & Sync',
      items: [
        { keys: ['C', 'or', 'N'], desc: 'Create a new task' },
        { keys: ['R'], desc: 'Force reload from GitLab API' },
        { keys: ['S'], desc: 'Trigger Cloud Backup & Sync' },
        { keys: ['?'], desc: 'Toggle keyboard shortcuts help' },
      ],
    },
  ];

  return (
    <Modal open={open} onClose={onClose} size="md" className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)]">
            <Keyboard className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-1)]">Keyboard Shortcuts</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded-md hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {shortcuts.map((cat) => (
          <div key={cat.category} className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
              {cat.category}
            </p>
            <div className="space-y-1.5">
              {cat.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-[var(--surface-2)]/40 border border-[var(--border)]/40">
                  <span className="text-[var(--text-2)]">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className={cn(
                          'px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border shadow-xs',
                          k === 'or'
                            ? 'border-transparent text-[var(--text-3)] bg-transparent shadow-none px-0.5'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-1)]'
                        )}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export interface DashboardProps {
  onSettings?: () => void;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onSettings }: DashboardProps) {
  const {
    projects, projectOverrides, issues, issuesLoading, issuesError, projectsLoading,
    loadingProgress, currentUser, lastFetchedAt,
    globalFilter, filterProjects, filterStatus, filterLabels, assignedToMe,
    setGlobalFilter, setFilterProjects, setFilterStatus, setFilterLabels, setAssignedToMe,
    initializeData, refreshAll, globalLabels, appSettings, customStatuses,
    viewMode, setViewMode, updateAvailable, latestVersion, checkForUpdate,
    boardStatuses,
    cloudSyncStatus, cloudSyncLastSynced, syncToCloud,
    theme, setTheme,
  } = useStore();

  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [standupOpen, setStandupOpen] = useState(false);
  const [editIssue, setEditIssue] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initial load — respects cache automatically
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    initializeData().then(() => {
      // Check for updates after data loads
      checkForUpdate?.().catch(() => { });
    });
  }, [initialized, initializeData, checkForUpdate]);

  const handleEdit = useCallback((issue: any) => { setEditIssue(issue); setModalOpen(true); }, []);
  const handleCreate = useCallback(() => { setEditIssue(null); setModalOpen(true); }, []);
  const handleClose = useCallback(() => { setModalOpen(false); setEditIssue(null); }, []);

  const handleForceRefresh = useCallback(async () => {
    const { result } = await confirm({
      title: 'Force Reload from GitLab?',
      description: 'This will discard your cached data and re-fetch everything from GitLab API. Your settings, labels, and pinned tasks are preserved.',
      confirmButtonText: 'Yes, Reload from GitLab',
      cancelButtonText: 'Cancel',
      danger: false,
    });
    if (!result) return;
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [confirm, refreshAll]);

  // Global Keyboard Shortcuts listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K opens Command Palette from anywhere
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }

      const activeEl = document.activeElement;
      const isInputActive = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement || (activeEl as HTMLElement)?.isContentEditable;

      if (e.key === '?' && !isInputActive) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      if (isInputActive) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === '1' || e.key === 't') {
        e.preventDefault();
        setViewMode('table');
        return;
      }

      if (e.key === '2' || e.key === 'b') {
        e.preventDefault();
        setViewMode('board');
        return;
      }

      if (e.key === 'c' || e.key === 'n') {
        e.preventDefault();
        handleCreate();
        return;
      }

      if (e.key === 'r') {
        e.preventDefault();
        handleForceRefresh();
        return;
      }

      if (e.key === 's') {
        e.preventDefault();
        syncToCloud();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreate, handleForceRefresh, syncToCloud, setViewMode]);

  // Aggregated stats
  // Aggregated stats (enabled projects only)
  const stats = useMemo(() => {
    const activeIssues = issues.filter((i) => {
      const override = projectOverrides?.[String(i.project_id)];
      return override?.enabled !== false;
    });
    const open = activeIssues.filter((i) => {
      const s = getEffectiveStatus(i, customStatuses);
      return s !== 'close';
    }).length;
    const closed = activeIssues.filter((i) => {
      const s = getEffectiveStatus(i, customStatuses);
      return s === 'close';
    }).length;
    const overdue = activeIssues.filter((i) => {
      const s = getEffectiveStatus(i, customStatuses);
      if (!i.due_date || s === 'close') return false;
      return new Date(i.due_date) < new Date();
    }).length;
    return { total: activeIssues.length, open, closed, overdue };
  }, [issues, customStatuses, projectOverrides]);

  // Only enabled projects for filter
  const enabledProjects = useMemo(() => {
    return projects.filter((p) => {
      const override = projectOverrides?.[String(p.id)];
      return override?.enabled !== false;
    });
  }, [projects, projectOverrides]);

  // Only global labels for filter dropdown (discards extra GitLab labels)
  const allLabels = useMemo(() => {
    return globalLabels || [];
  }, [globalLabels]);

  // Options for modern FilterSelect components (with project images)
  const projectOptions = useMemo(() => {
    return enabledProjects.map((p) => {
      const override = projectOverrides?.[String(p.id)];
      const displayName = override?.customName || p.name;
      const hue = (p.id * 137) % 360;
      return {
        value: String(p.id),
        label: displayName,
        subtitle: p.path_with_namespace,
        icon: (
          <div className="flex items-center shrink-0">
            {p.avatar_url ? (
              <img
                src={p.avatar_url}
                alt=""
                className="h-4 w-4 rounded object-cover border border-[var(--border)] mr-1"
                onError={(e: any) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <span
              className={cn(
                'h-4 w-4 rounded text-[9px] font-bold flex items-center justify-center text-white mr-1',
                p.avatar_url && 'hidden'
              )}
              style={{ background: `hsl(${hue}, 55%, 35%)` }}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        ),
      };
    });
  }, [enabledProjects, projectOverrides]);

  const statusOptions = useMemo(() => {
    const list = boardStatuses?.length ? boardStatuses : TASK_STATUSES;
    return list
      .filter((s) => s.enabled)
      .map((s) => ({
        value: s.id,
        label: s.label,
        color: s.color,
      }));
  }, [boardStatuses]);

  const labelOptions = useMemo(() => {
    return allLabels.map((l) => ({
      value: l.name,
      label: l.name,
      color: l.color,
    }));
  }, [allLabels]);

  const isLoading = issuesLoading || projectsLoading;
  const hasStatusFilter = Array.isArray(filterStatus) ? filterStatus.length > 0 : Boolean(filterStatus && filterStatus !== 'all');
  const hasFilters = (filterProjects && filterProjects.length > 0) || hasStatusFilter || (filterLabels && filterLabels.length > 0) || Boolean(globalFilter) || assignedToMe;

  const clearFilters = () => {
    setGlobalFilter('');
    setFilterProjects([]);
    setFilterStatus([]);
    setFilterLabels([]);
    setAssignedToMe(false);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] theme-transition">
      {/* ── Update Banner ───────────────────────────────────────────────────── */}
      {updateAvailable && (
        <div className="shrink-0 flex items-center gap-2 px-5 py-2 bg-[var(--accent-muted)] border-b border-[var(--accent)]/30 animate-fade-in">
          <Bell className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
          <span className="text-xs text-[var(--text-1)] flex-1">
            <strong>Update available!</strong> Version {latestVersion} is out.
          </span>
          <a
            href={`https://github.com/${appSettings?.githubRepo || 'Shariar-Hasan/gitlab-task-management'}/releases/latest`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline font-medium"
          >
            View Release <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-[var(--border)] px-5 py-3 bg-[var(--surface)] theme-transition">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-emerald-800 flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <GitBranch className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-1)] leading-tight">GitLab Tasks</h1>
              <p className="text-[10px] text-[var(--text-3)] leading-tight">
                {currentUser ? `@${currentUser.username}` : 'Unified Dashboard'}
              </p>
            </div>
          </div>

          {/* Omnibar / Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] hover:border-[var(--border-hover)] text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-all cursor-pointer shadow-xs min-w-[210px] max-w-sm"
            title="Press Ctrl+K or Cmd+K to search tasks or trigger commands"
          >
            <Search className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="flex-1 text-left truncate">Search or run command...</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <CacheStatus lastFetchedAt={lastFetchedAt} />

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('table')}
                title="Table View (1 or T)"
                className={cn(
                  'flex items-center justify-center h-6 w-6 rounded-md transition-all cursor-pointer',
                  viewMode !== 'board'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                title="Board (Kanban) View (2 or B)"
                className={cn(
                  'flex items-center justify-center h-6 w-6 rounded-md transition-all cursor-pointer',
                  viewMode === 'board'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                )}
              >
                <Kanban className="h-3.5 w-3.5" />
              </button>
            </div>

            <ThemeToggle />

            {/* Standup & Velocity Insights */}
            <button
              type="button"
              onClick={() => setStandupOpen(true)}
              title="Daily Standup Generator & Velocity Insights"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)] text-[var(--text-2)] text-xs transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden xl:inline text-[11px] font-medium">Standup & Insights</span>
            </button>

            {/* Cloud Backup Quick Sync */}
            <button
              type="button"
              onClick={() => syncToCloud()}
              disabled={cloudSyncStatus === 'syncing'}
              title={
                cloudSyncLastSynced
                  ? `GitLab Cloud Backup: Last synced at ${new Date(cloudSyncLastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Click to sync now (S).`
                  : 'GitLab Cloud Backup: Click to sync now (S).'
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)] text-[var(--text-2)] text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', cloudSyncStatus === 'syncing' ? 'animate-spin text-[var(--accent)]' : cloudSyncStatus === 'error' ? 'text-red-500' : 'text-emerald-500')} />
              <span className="hidden xl:inline text-[11px] font-medium">
                {cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Cloud Backup'}
              </span>
            </button>

            {/* Shortcuts help button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard Shortcuts (?)"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost" size="icon-sm"
              onClick={handleForceRefresh}
              disabled={refreshing || isLoading}
              title="Force refresh from GitLab"
            >
              <RefreshCw className={cn('h-4 w-4', (refreshing || isLoading) && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onSettings} title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>
      </header>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-4 gap-3 px-5 py-3 border-b border-[var(--border)]">
        <StatCard label="Total" value={stats.total} icon={BarChart3} colorClass="text-[var(--accent)]" loading={isLoading && stats.total === 0} />
        <StatCard label="Open" value={stats.open} icon={Circle} colorClass="text-blue-500" loading={isLoading && stats.total === 0} />
        <StatCard label="Closed" value={stats.closed} icon={CheckCircle2} colorClass="text-emerald-500" loading={isLoading && stats.total === 0} />
        <StatCard label="Overdue" value={stats.overdue} icon={Clock} colorClass="text-red-500" loading={isLoading && stats.total === 0} />
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center flex-wrap gap-2 px-5 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] theme-transition">
        <div className="flex items-center gap-1 text-[var(--text-3)] text-xs mr-1 shrink-0">
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline font-medium text-[11px] uppercase tracking-wider">Filters</span>
        </div>

        {/* Search in Filter Section */}
        <div className="relative min-w-[180px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
          <Input
            ref={searchInputRef}
            id="filter-search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search tasks, labels... (/)"
            className="pl-8 h-8 text-xs pr-7 bg-[var(--surface)] border-[var(--border)]"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Project Select (Multi-Select) */}
        <FilterSelect
          id="filter-project"
          label="Project"
          value={filterProjects}
          onChange={setFilterProjects}
          options={projectOptions}
          icon={FolderGit2}
          allLabel="All Projects"
          searchPlaceholder="Search project..."
          width={280}
          isMulti
        />

        {/* Status Select (Multi-Select) */}
        <FilterSelect
          id="filter-status"
          label="Status"
          value={Array.isArray(filterStatus) ? filterStatus : (filterStatus && filterStatus !== 'all' ? [filterStatus] : [])}
          onChange={(val) => setFilterStatus(val)}
          options={statusOptions}
          icon={CircleDot}
          allLabel="All Status"
          width={220}
          isMulti
        />

        {/* Label Select (Multi-Select) */}
        {allLabels.length > 0 && (
          <FilterSelect
            id="filter-label"
            label="Label"
            value={filterLabels}
            onChange={setFilterLabels}
            options={labelOptions}
            icon={Tag}
            allLabel="All Labels"
            searchPlaceholder="Search label..."
            width={240}
            isMulti
          />
        )}

        {/* Assigned to Me Filter */}
        {currentUser && (
          <button
            onClick={() => setAssignedToMe(!assignedToMe)}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer',
              assignedToMe
                ? 'border-[var(--accent)]/40 bg-[var(--accent-muted)] text-[var(--text-1)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)]'
            )}
          >
            <User className={cn('h-3.5 w-3.5 shrink-0', assignedToMe ? 'text-[var(--accent)]' : 'text-[var(--text-3)]')} />
            <span className={assignedToMe ? 'font-semibold' : ''}>Assigned to Me</span>
          </button>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" /> Reset all
          </button>
        )}

        {/* Right side status */}
        <div className="flex items-center gap-2 ml-auto">
          {isLoading ? (
            <div className="flex items-center gap-1.5">
              <Spinner size="sm" />
              <span className="text-xs text-[var(--text-3)]">
                {loadingProgress > 0 && loadingProgress < 100 ? `${loadingProgress}%` : 'Loading...'}
              </span>
              {loadingProgress > 0 && loadingProgress < 100 && (
                <ProgressBar value={loadingProgress} className="w-24" />
              )}
            </div>
          ) : (
            <span className="text-xs text-[var(--text-3)]">
              {issues.length.toLocaleString()} tasks · {enabledProjects.length} projects · closed ≤30d
            </span>
          )}
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {issuesError && (
        <div className="mx-5 mt-3 flex items-center gap-2.5 p-3 rounded-xl border border-red-500/25 bg-red-500/10 text-red-500 text-sm animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Failed to load tasks</p>
            <p className="text-xs text-red-500/70 mt-0.5">{issuesError}</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleForceRefresh} className="shrink-0">Retry</Button>
        </div>
      )}

      {/* ── Main Content (Table or Board) ───────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' ? (
          <BoardView onEdit={handleEdit} />
        ) : (
          <TaskTable onEdit={handleEdit} />
        )}
      </div>

      <TaskModal open={modalOpen} onClose={handleClose} editIssue={editIssue} />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* ── Command Palette (Ctrl+K / Cmd+K) ─────────────────────────────────── */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        tasks={issues}
        projects={projects}
        projectOverrides={projectOverrides}
        customStatuses={customStatuses}
        boardStatuses={boardStatuses?.length ? boardStatuses : TASK_STATUSES}
        onSelectTask={handleEdit}
        onCreateTask={handleCreate}
        onSwitchView={setViewMode}
        onOpenSettings={onSettings || (() => {})}
        onOpenStandup={() => setStandupOpen(true)}
        onForceRefresh={handleForceRefresh}
        onCloudSync={syncToCloud}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onFilterProject={(pid) => setFilterProjects([pid])}
        onFilterStatus={(sid) => setFilterStatus([sid])}
        theme={theme}
      />

      {/* ── Standup & Insights Modal ────────────────────────────────────────── */}
      <StandupInsightsModal
        open={standupOpen}
        onClose={() => setStandupOpen(false)}
        tasks={issues}
        projects={projects}
        projectOverrides={projectOverrides}
        customStatuses={customStatuses}
        boardStatuses={boardStatuses?.length ? boardStatuses : TASK_STATUSES}
        currentUser={currentUser}
        onSelectTask={handleEdit}
      />
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import {
  GitBranch, Search, Plus, Filter, RefreshCw, Settings,
  AlertCircle, X, BarChart3, CheckCircle2, Clock, Circle,
  FolderGit2, CircleDot, Tag,
} from 'lucide-react';
import {
  Button, Input, Spinner, ProgressBar, Skeleton, Card,
  ThemeToggle, CacheStatus, FilterSelect,
} from './ui/index.jsx';
import TaskTable from './TaskTable.jsx';
import TaskModal from './TaskModal.jsx';
import useStore from '../store/useStore.js';
import { cn } from '../lib/utils.js';
import { TASK_STATUSES, getEffectiveStatus } from '../lib/localStore.js';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, loading }) {
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

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onSettings }) {
  const {
    projects, issues, issuesLoading, issuesError, projectsLoading,
    loadingProgress, currentUser, lastFetchedAt,
    globalFilter, filterProjects, filterStatus, filterLabels,
    setGlobalFilter, setFilterProjects, setFilterStatus, setFilterLabels,
    initializeData, refreshAll, globalLabels, appSettings, customStatuses,
  } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editIssue, setEditIssue] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load — respects cache automatically
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    initializeData();
  }, [initialized, initializeData]);

  const handleEdit   = (issue) => { setEditIssue(issue); setModalOpen(true); };
  const handleCreate = () => { setEditIssue(null); setModalOpen(true); };
  const handleClose  = () => { setModalOpen(false); setEditIssue(null); };

  const handleForceRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  // Aggregated stats
  const stats = useMemo(() => {
    const open = issues.filter((i) => {
      const s = getEffectiveStatus(i, customStatuses);
      return s !== 'close';
    }).length;
    const closed = issues.filter((i) => {
      const s = getEffectiveStatus(i, customStatuses);
      return s === 'close';
    }).length;
    const overdue = issues.filter((i) => {
      const s = getEffectiveStatus(i, customStatuses);
      if (!i.due_date || s === 'close') return false;
      return new Date(i.due_date) < new Date();
    }).length;
    return { total: issues.length, open, closed, overdue };
  }, [issues, customStatuses]);

  // Only global labels for filter dropdown (discards extra GitLab labels)
  const allLabels = useMemo(() => {
    return globalLabels || [];
  }, [globalLabels]);

  // Options for modern FilterSelect components (with project images)
  const projectOptions = useMemo(() => {
    return projects.map((p) => {
      const hue = (p.id * 137) % 360;
      return {
        value: String(p.id),
        label: p.name,
        subtitle: p.path_with_namespace,
        icon: (
          <div className="flex items-center shrink-0">
            {p.avatar_url ? (
              <img
                src={p.avatar_url}
                alt=""
                className="h-4 w-4 rounded object-cover border border-[var(--border)] mr-1"
                onError={(e) => {
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
              {p.name.charAt(0).toUpperCase()}
            </span>
          </div>
        ),
      };
    });
  }, [projects]);

  const statusOptions = useMemo(() => {
    return TASK_STATUSES.map((s) => ({
      value: s.id,
      label: s.label,
      color: s.color,
    }));
  }, []);

  const labelOptions = useMemo(() => {
    return allLabels.map((l) => ({
      value: l.name,
      label: l.name,
      color: l.color,
    }));
  }, [allLabels]);

  const isLoading  = issuesLoading || projectsLoading;
  const hasStatusFilter = Array.isArray(filterStatus) ? filterStatus.length > 0 : (filterStatus && filterStatus !== 'all');
  const hasFilters = (filterProjects && filterProjects.length > 0) || hasStatusFilter || (filterLabels && filterLabels.length > 0) || globalFilter;

  const clearFilters = () => {
    setGlobalFilter(''); setFilterProjects([]); setFilterStatus([]); setFilterLabels([]);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] theme-transition">
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

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
            <Input
              id="global-search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search tasks, projects, labels..."
              className="pl-8 h-8 text-xs pr-8"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <CacheStatus lastFetchedAt={lastFetchedAt} />
            <ThemeToggle />
            <Button
              variant="ghost" size="icon-sm"
              onClick={handleForceRefresh}
              disabled={refreshing || isLoading}
              title="Force refresh (bypass cache)"
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
        <StatCard label="Total"   value={stats.total}   icon={BarChart3}    colorClass="text-[var(--accent)]"  loading={isLoading && stats.total === 0} />
        <StatCard label="Open"    value={stats.open}    icon={Circle}       colorClass="text-blue-500"          loading={isLoading && stats.total === 0} />
        <StatCard label="Closed"  value={stats.closed}  icon={CheckCircle2} colorClass="text-emerald-500"       loading={isLoading && stats.total === 0} />
        <StatCard label="Overdue" value={stats.overdue} icon={Clock}        colorClass="text-red-500"           loading={isLoading && stats.total === 0} />
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center flex-wrap gap-2 px-5 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] theme-transition">
        <div className="flex items-center gap-1 text-[var(--text-3)] text-xs mr-1 shrink-0">
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline font-medium text-[11px] uppercase tracking-wider">Filters</span>
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
              {issues.length.toLocaleString()} tasks · {projects.length} projects · closed ≤30 days
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

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <TaskTable onEdit={handleEdit} />
      </div>

      <TaskModal open={modalOpen} onClose={handleClose} editIssue={editIssue} />
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import {
  Sparkles, BarChart3, Copy, Check, Download, AlertTriangle,
  Clock, CheckCircle2, CircleDot, FolderGit2, Calendar, FileText,
  User, RefreshCw, X
} from 'lucide-react';
import { Modal } from './ui/overlay';
import { Button } from './ui/index';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { getEffectiveStatus } from '../lib/localStore';

export interface StandupInsightsModalProps {
  open: boolean;
  onClose: () => void;
  tasks: any[];
  projects: any[];
  projectOverrides: Record<string, any>;
  customStatuses: Record<string, string>;
  boardStatuses: any[];
  currentUser: any;
  onSelectTask?: (task: any) => void;
}

export default function StandupInsightsModal({
  open,
  onClose,
  tasks,
  projects,
  projectOverrides,
  customStatuses,
  boardStatuses,
  currentUser,
  onSelectTask,
}: StandupInsightsModalProps) {
  const [activeTab, setActiveTab] = useState<'standup' | 'analytics'>('standup');
  const [myTasksOnly, setMyTasksOnly] = useState(true);
  const [copied, setCopied] = useState(false);

  // Map of project id to project object
  const projectMap = useMemo(() => {
    const map = new Map<number | string, any>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filter tasks based on enabled projects and myTasksOnly toggle
  const relevantTasks = useMemo(() => {
    return tasks.filter((t) => {
      const override = projectOverrides[String(t.project_id)];
      if (override?.enabled === false) return false;
      if (myTasksOnly && currentUser?.id) {
        const assignees = t.assignees || [];
        const isAssigned = assignees.some((a: any) => a.id === currentUser.id);
        if (!isAssigned) return false;
      }
      return true;
    });
  }, [tasks, projectOverrides, myTasksOnly, currentUser]);

  // Analytics metrics
  const analytics = useMemo(() => {
    const total = relevantTasks.length;
    const closed = relevantTasks.filter((t) => getEffectiveStatus(t, customStatuses) === 'close').length;
    const open = total - closed;
    const completionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    const overdueList = relevantTasks.filter((t) => {
      const s = getEffectiveStatus(t, customStatuses);
      if (!t.due_date || s === 'close') return false;
      return new Date(t.due_date) < new Date();
    });

    // Breakdown by board statuses
    const statusCounts = boardStatuses
      .filter((s) => s.enabled)
      .map((s) => {
        const count = relevantTasks.filter((t) => getEffectiveStatus(t, customStatuses) === s.id).length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return { ...s, count, pct };
      });

    // Workload by project
    const projCounts: Record<string, { name: string; count: number; openCount: number }> = {};
    relevantTasks.forEach((t) => {
      const pid = String(t.project_id);
      const proj = projectMap.get(t.project_id);
      const name = projectOverrides[pid]?.customName || proj?.name || `Project #${pid}`;
      if (!projCounts[pid]) {
        projCounts[pid] = { name, count: 0, openCount: 0 };
      }
      projCounts[pid].count++;
      if (getEffectiveStatus(t, customStatuses) !== 'close') {
        projCounts[pid].openCount++;
      }
    });

    const topProjects = Object.values(projCounts)
      .sort((a, b) => b.openCount - a.openCount)
      .slice(0, 5);

    return {
      total,
      open,
      closed,
      completionRate,
      overdueList,
      statusCounts,
      topProjects,
    };
  }, [relevantTasks, customStatuses, boardStatuses, projectMap, projectOverrides]);

  // Categorize tasks for daily standup
  const standupCategories = useMemo(() => {
    const completed: any[] = [];
    const inProgress: any[] = [];
    const upcoming: any[] = [];
    const overdue: any[] = [];

    relevantTasks.forEach((task) => {
      const status = getEffectiveStatus(task, customStatuses);
      const isPastDue = task.due_date && new Date(task.due_date) < new Date() && status !== 'close';

      if (isPastDue) {
        overdue.push(task);
      }

      if (status === 'close') {
        completed.push(task);
      } else if (status === 'ongoing' || status === 'testing') {
        inProgress.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return { completed, inProgress, upcoming, overdue };
  }, [relevantTasks, customStatuses]);

  // Build formatted markdown standup text
  const standupMarkdown = useMemo(() => {
    const todayStr = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const getTaskLine = (t: any) => {
      const proj = projectMap.get(t.project_id);
      const projName = projectOverrides[String(t.project_id)]?.customName || proj?.name || `Proj-${t.project_id}`;
      const dueInfo = t.due_date ? ` (Due: ${t.due_date})` : '';
      return `- [${projName}] #${t.iid} ${t.title}${dueInfo}`;
    };

    let md = `### 🚀 Daily Standup — ${todayStr}\n`;
    if (currentUser?.name) {
      md += `**Author:** ${currentUser.name} (@${currentUser.username})\n\n`;
    }

    md += `#### 🔄 In Progress & Today's Focus\n`;
    if (standupCategories.inProgress.length === 0) {
      md += `_No active tasks in progress_\n`;
    } else {
      standupCategories.inProgress.forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    md += `\n#### ✅ Completed Recently\n`;
    if (standupCategories.completed.length === 0) {
      md += `_No tasks marked closed recently_\n`;
    } else {
      standupCategories.completed.slice(0, 10).forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    if (standupCategories.overdue.length > 0) {
      md += `\n#### ⚠️ Blockers & Overdue Tasks\n`;
      standupCategories.overdue.forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    if (standupCategories.upcoming.length > 0) {
      md += `\n#### 📋 Next in Queue (Backlog / Open)\n`;
      standupCategories.upcoming.slice(0, 5).forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    return md;
  }, [standupCategories, currentUser, projectMap, projectOverrides]);

  const handleCopy = () => {
    navigator.clipboard.writeText(standupMarkdown);
    setCopied(true);
    toast.success('Standup report copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([standupMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `standup_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Standup markdown file downloaded');
  };

  const handleExportCsv = () => {
    const headers = ['Project', 'IID', 'Title', 'Status', 'Due Date', 'Web URL'];
    const rows = relevantTasks.map((t) => {
      const proj = projectMap.get(t.project_id);
      const projName = projectOverrides[String(t.project_id)]?.customName || proj?.name || '';
      const status = getEffectiveStatus(t, customStatuses);
      return [
        `"${projName.replace(/"/g, '""')}"`,
        t.iid,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        status,
        t.due_date || '',
        t.web_url || '',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gitlab_tasks_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Tasks exported to CSV');
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" className="p-0 overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-700 flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-1)]">Productivity & Daily Standup</h2>
            <p className="text-xs text-[var(--text-3)]">
              Instant standup reports, velocity breakdown & task analytics
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface-3)] p-1 rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setActiveTab('standup')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'standup'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Standup
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'analytics'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Velocity
          </button>
        </div>
      </div>

      {/* Subheader controls */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--border)] bg-[var(--surface)] text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer',
              myTasksOnly
                ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]'
            )}
          >
            <User className="h-3.5 w-3.5" />
            {myTasksOnly ? 'Showing My Assigned Tasks' : 'Showing All Tasks'}
          </button>
          <span className="text-[var(--text-3)]">
            {relevantTasks.length} task{relevantTasks.length === 1 ? '' : 's'} loaded
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} title="Export filtered tasks to CSV">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {activeTab === 'standup' ? (
          <div className="space-y-4">
            {/* Quick Standup Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-1)] leading-none">
                    {standupCategories.inProgress.length}
                  </div>
                  <div className="text-[11px] text-[var(--text-3)] mt-1">In Progress / Active</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-1)] leading-none">
                    {standupCategories.completed.length}
                  </div>
                  <div className="text-[11px] text-[var(--text-3)] mt-1">Completed</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--text-1)] leading-none">
                    {standupCategories.overdue.length}
                  </div>
                  <div className="text-[11px] text-[var(--text-3)] mt-1">Overdue / Blocked</div>
                </div>
              </div>
            </div>

            {/* Standup Markdown Output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                  Generated Standup Markdown
                </label>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" />
                    Download .md
                  </Button>
                  <Button size="sm" onClick={handleCopy} className="gap-1.5 font-semibold">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy for Slack / Teams'}
                  </Button>
                </div>
              </div>

              <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
                <textarea
                  readOnly
                  value={standupMarkdown}
                  rows={12}
                  className="w-full p-4 bg-transparent text-xs font-mono text-[var(--text-1)] focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Analytics Tab */
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--text-3)] font-bold uppercase">Total Tasks</span>
                <span className="text-2xl font-bold text-[var(--text-1)]">{analytics.total}</span>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--text-3)] font-bold uppercase">Open Tasks</span>
                <span className="text-2xl font-bold text-amber-400">{analytics.open}</span>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--text-3)] font-bold uppercase">Closed Tasks</span>
                <span className="text-2xl font-bold text-emerald-400">{analytics.closed}</span>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--text-3)] font-bold uppercase">Completion Velocity</span>
                <span className="text-2xl font-bold text-[var(--accent)]">{analytics.completionRate}%</span>
              </div>
            </div>

            {/* Status Breakdown Bar */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-1)]">
                <span>Task Distribution Across Statuses</span>
                <span className="text-[var(--text-3)]">{analytics.total} total</span>
              </div>

              {/* Progress segments bar */}
              <div className="h-3 w-full rounded-full bg-[var(--surface-3)] overflow-hidden flex">
                {analytics.statusCounts.map((s) => (
                  <div
                    key={s.id}
                    title={`${s.label}: ${s.count} (${s.pct}%)`}
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                    className="h-full transition-all duration-300"
                  />
                ))}
              </div>

              {/* Status legends */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
                {analytics.statusCounts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-[var(--surface)]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[var(--text-2)] truncate text-[11px]">{s.label}</span>
                    </div>
                    <span className="font-semibold text-[var(--text-1)] text-[11px]">
                      {s.count} <span className="text-[var(--text-3)] font-normal">({s.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Projects Workload */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-1)]">
                <div className="flex items-center gap-1.5">
                  <FolderGit2 className="h-4 w-4 text-[var(--accent)]" />
                  <span>Top Projects by Workload</span>
                </div>
                <span className="text-[var(--text-3)]">Open tasks ranking</span>
              </div>

              <div className="space-y-2">
                {analytics.topProjects.map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-1)] font-medium truncate max-w-xs">{p.name}</span>
                      <span className="text-[var(--text-3)] text-[11px]">
                        <strong>{p.openCount}</strong> open / {p.count} total
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                        style={{ width: `${analytics.total > 0 ? (p.openCount / analytics.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]/60">
        <span className="text-[11px] text-[var(--text-3)]">
          Pro-tip: Press <kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded font-mono text-[10px]">Ctrl+K</kbd> to launch standup anytime.
        </span>
        <Button variant="outline" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

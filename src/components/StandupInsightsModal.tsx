import React, { useState, useMemo } from 'react';
import {
  BarChart3, Copy, Check, Download,
  FolderGit2, FileText, User, X
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

  // Clean, professional, human-style Markdown standup (NO emojis)
  const standupMarkdown = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const getTaskLine = (t: any) => {
      const proj = projectMap.get(t.project_id);
      const projName = projectOverrides[String(t.project_id)]?.customName || proj?.name || `Project #${t.project_id}`;
      const dueInfo = t.due_date ? ` (Due: ${t.due_date})` : '';
      return `- [${projName}] #${t.iid}: ${t.title}${dueInfo}`;
    };

    let md = `# Daily Standup - ${todayStr}\n`;
    if (currentUser?.name) {
      md += `User: ${currentUser.name} (@${currentUser.username})\n\n`;
    }

    md += `## In Progress\n`;
    if (standupCategories.inProgress.length === 0) {
      md += `- None\n`;
    } else {
      standupCategories.inProgress.forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    md += `\n## Completed\n`;
    if (standupCategories.completed.length === 0) {
      md += `- None\n`;
    } else {
      standupCategories.completed.slice(0, 10).forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    if (standupCategories.overdue.length > 0) {
      md += `\n## Blockers & Overdue\n`;
      standupCategories.overdue.forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    if (standupCategories.upcoming.length > 0) {
      md += `\n## Backlog / Next Up\n`;
      standupCategories.upcoming.slice(0, 5).forEach((t) => { md += `${getTaskLine(t)}\n`; });
    }

    return md;
  }, [standupCategories, currentUser, projectMap, projectOverrides]);

  const handleCopy = () => {
    navigator.clipboard.writeText(standupMarkdown);
    setCopied(true);
    toast.success('Standup report copied to clipboard');
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
    toast.success('Standup markdown file saved');
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
    link.download = `gitlab_tasks_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Tasks exported to CSV');
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" className="p-0 overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header - Clean & Understated */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-1)]">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-1)]">Daily Standup & Summary</h2>
            <p className="text-[11px] text-[var(--text-3)]">
              Markdown standup report and project velocity
            </p>
          </div>
        </div>

        {/* Tab switcher - Minimalist pill */}
        <div className="flex items-center gap-0.5 bg-[var(--surface-2)] p-0.5 rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setActiveTab('standup')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'standup'
                ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-xs border border-[var(--border)]'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            )}
          >
            Standup
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'analytics'
                ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-xs border border-[var(--border)]'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            )}
          >
            Velocity
          </button>
        </div>
      </div>

      {/* Subheader controls */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]/30 text-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors cursor-pointer',
              myTasksOnly
                ? 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-1)] font-medium shadow-xs'
                : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
            )}
          >
            <User className="h-3.5 w-3.5" />
            {myTasksOnly ? 'My Tasks Only' : 'All Workspace Tasks'}
          </button>
          <span className="text-[11px] text-[var(--text-3)]">
            {relevantTasks.length} task{relevantTasks.length === 1 ? '' : 's'}
          </span>
        </div>

        <Button variant="ghost" size="sm" onClick={handleExportCsv} className="h-7 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Body Content */}
      <div className="p-5 overflow-y-auto flex-1 space-y-4">
        {activeTab === 'standup' ? (
          <div className="space-y-4">
            {/* Neutral, clean summary numbers */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="text-[11px] text-[var(--text-3)]">In Progress</div>
                <div className="text-xl font-semibold text-[var(--text-1)] mt-0.5">
                  {standupCategories.inProgress.length}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="text-[11px] text-[var(--text-3)]">Completed</div>
                <div className="text-xl font-semibold text-[var(--text-1)] mt-0.5">
                  {standupCategories.completed.length}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="text-[11px] text-[var(--text-3)]">Overdue</div>
                <div className="text-xl font-semibold text-[var(--text-1)] mt-0.5">
                  {standupCategories.overdue.length}
                </div>
              </div>
            </div>

            {/* Standup Markdown Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-wider">
                  Markdown Output
                </span>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 text-xs">
                    <Download className="h-3 w-3" />
                    .md
                  </Button>
                  <Button size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 overflow-hidden">
                <textarea
                  readOnly
                  value={standupMarkdown}
                  rows={13}
                  className="w-full p-3.5 bg-transparent text-xs font-mono text-[var(--text-1)] focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Analytics Tab - Minimal, subtle, no rainbow colors */
          <div className="space-y-4">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="text-[10px] text-[var(--text-3)] uppercase font-semibold">Total</div>
                <div className="text-xl font-semibold text-[var(--text-1)] mt-0.5">{analytics.total}</div>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="text-[10px] text-[var(--text-3)] uppercase font-semibold">Open</div>
                <div className="text-xl font-semibold text-[var(--text-1)] mt-0.5">{analytics.open}</div>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="text-[10px] text-[var(--text-3)] uppercase font-semibold">Closed</div>
                <div className="text-xl font-semibold text-[var(--text-1)] mt-0.5">{analytics.closed}</div>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="text-[10px] text-[var(--text-3)] uppercase font-semibold">Velocity</div>
                <div className="text-xl font-semibold text-[var(--text-1)] mt-0.5">{analytics.completionRate}%</div>
              </div>
            </div>

            {/* Clean Progress Bar */}
            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-1)]">
                <span className="font-medium">Task Completion</span>
                <span className="text-[var(--text-3)] text-[11px]">{analytics.closed} of {analytics.total} completed ({analytics.completionRate}%)</span>
              </div>

              <div className="h-2 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                  style={{ width: `${analytics.completionRate}%` }}
                />
              </div>
            </div>

            {/* Status counts list - Clean neutral table */}
            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
              <div className="text-xs font-medium text-[var(--text-1)]">Status Distribution</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {analytics.statusCounts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)]/40">
                    <span className="text-[var(--text-2)] truncate text-[11px]">{s.label}</span>
                    <span className="font-mono text-[11px] text-[var(--text-1)] font-medium">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Projects Workload */}
            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[var(--text-1)]">
                <span className="font-medium">Active Projects Workload</span>
                <span className="text-[var(--text-3)] text-[11px]">Open tasks</span>
              </div>

              <div className="space-y-2">
                {analytics.topProjects.map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-1)] truncate max-w-sm">{p.name}</span>
                      <span className="text-[var(--text-3)] font-mono text-[11px]">{p.openCount} open</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--text-3)]/60 rounded-full transition-all duration-300"
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
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--border)] bg-[var(--surface-2)]/30">
        <span className="text-[11px] text-[var(--text-3)]">
          Press Esc to close
        </span>
        <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
          Close
        </Button>
      </div>
    </Modal>
  );
}

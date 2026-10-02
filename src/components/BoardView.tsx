import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  GripVertical, Loader2, SlidersHorizontal, Check,
} from 'lucide-react';
import { cn } from '../lib/utils';
import useStore from '../store/useStore';
import { TASK_STATUSES, getEffectiveStatus, type TaskStatus } from '../lib/localStore';
import { Button } from './ui/index';
import { DropdownMenu, DropdownItem, DropdownSeparator, useToast } from './ui/overlay';

// Inline mini-avatar
function MiniAvatar({ src, name, size = 20 }: { src?: string | null; name?: string | null; size?: number }) {
  const [errored, setErrored] = React.useState(false);
  const initials = (name || '?').split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  const hue = ((name || '').charCodeAt(0) * 7) % 360;
  return src && !errored ? (
    <img src={src} alt={name || 'Avatar'} onError={() => setErrored(true)}
      style={{ width: size, height: size }}
      className="rounded-full object-cover border-2 border-[var(--surface)]"
    />
  ) : (
    <div style={{ width: size, height: size, background: `hsl(${hue}, 50%, 40%)` }}
      className="rounded-full border-2 border-[var(--surface)] flex items-center justify-center text-white font-bold text-[9px]"
    >{initials}</div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDueInfo(dueDate?: string | null) {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, cls: 'bg-red-500/15 text-red-500 border-red-500/20' };
  if (diffDays === 0) return { text: 'Due today', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/20' };
  if (diffDays <= 3) return { text: `Due in ${diffDays}d`, cls: 'bg-amber-500/15 text-amber-500 border-amber-500/20' };
  return { text: `Due ${diffDays}d`, cls: 'bg-[var(--surface-3)] text-[var(--text-3)] border-[var(--border)]' };
}

interface TaskCardProps {
  issue: any;
  status: string;
  isDragging: boolean;
  onDragStart: () => void;
  onEdit: (issue: any) => void;
  globalLabels: any[];
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({ issue, status, isDragging, onDragStart, onEdit, globalLabels }: TaskCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dueInfo = getDueInfo(issue.due_date);
  const assignees = issue.assignees || (issue.assignee ? [issue.assignee] : []);
  const labelNames = (issue.labels || []).map((l: any) => (typeof l === 'string' ? l : l?.name)).filter(Boolean);
  const visibleLabels = labelNames
    .map((name: string) => globalLabels.find((g) => g.name.toLowerCase() === name.toLowerCase()))
    .filter(Boolean)
    .slice(0, 3);

  const statusInfo = TASK_STATUSES.find((s) => s.id === status);

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={onDragStart}
      className={cn(
        'group relative p-3 rounded-xl border bg-[var(--surface)] shadow-xs',
        'cursor-grab active:cursor-grabbing transition-all duration-150',
        'hover:border-[var(--accent)]/40 hover:shadow-md',
        isDragging
          ? 'opacity-40 scale-95 border-[var(--accent)]'
          : 'border-[var(--border)] hover:translate-y-[-1px]'
      )}
      onClick={() => onEdit(issue)}
    >
      {/* Status dot */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: statusInfo?.color || '#64748b' }}
          />
          <span className="text-[10px] text-[var(--text-3)] font-mono">
            #{issue.iid}
          </span>
        </div>
        <GripVertical className="h-3.5 w-3.5 text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>

      {/* Title */}
      <p className="text-xs font-medium text-[var(--text-1)] leading-relaxed line-clamp-2 mb-2.5">
        {issue.title}
      </p>

      {/* Labels */}
      {visibleLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {visibleLabels.map((l: any) => (
            <span
              key={l.name}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border"
              style={{
                backgroundColor: `${l.color}1a`,
                color: l.color,
                borderColor: `${l.color}40`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              {l.name}
            </span>
          ))}
          {labelNames.length > 3 && (
            <span className="text-[10px] text-[var(--text-3)] px-1 py-0.5">+{labelNames.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer: due date + assignees */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {dueInfo && (
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-medium', dueInfo.cls)}>
              {dueInfo.text}
            </span>
          )}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-1">
            {assignees.slice(0, 3).map((a: any, i: number) => (
              <MiniAvatar
                key={a.id || i}
                src={a.avatar_url}
                name={a.name || a.username}
                size={18}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface BoardColumnProps {
  status: TaskStatus;
  tasks: any[];
  onEdit: (issue: any) => void;
  globalLabels: any[];
  draggingIssueId: string | null;
  draggingStatus?: string;
  onDragStart: (issue: any, statusId: string) => void;
  onDrop: (statusId: string) => void;
  onDragOver: (statusId: string) => void;
  onDragLeave: () => void;
  isDragTarget: boolean;
  isUpdating: boolean;
}

// ── Column ──────────────────────────────────────────────────────────────────────
function BoardColumn({
  status, tasks, onEdit, globalLabels,
  draggingIssueId, draggingStatus,
  onDragStart, onDrop, onDragOver, onDragLeave,
  isDragTarget,
  isUpdating,
}: BoardColumnProps) {
  const taskCount = tasks.length;

  return (
    <div
      className={cn(
        'flex flex-col w-[280px] shrink-0 rounded-2xl border transition-all duration-150',
        isDragTarget
          ? 'border-[var(--accent)]/50 bg-[var(--accent-muted)]/30 shadow-lg shadow-[var(--accent)]/10'
          : 'border-[var(--border)] bg-[var(--surface-2)]/60'
      )}
      onDragOver={(e) => { e.preventDefault(); onDragOver(status.id); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(status.id); }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-xs font-semibold text-[var(--text-1)]">{status.label}</span>
          <span className="text-[10px] font-mono text-[var(--text-3)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded-full border border-[var(--border)]">
            {taskCount}
          </span>
        </div>
        {isUpdating && <Loader2 className="h-3.5 w-3.5 text-[var(--accent)] animate-spin" />}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px] max-h-[calc(100vh-280px)]">
        {tasks.length === 0 && (
          <div className={cn(
            'flex items-center justify-center h-20 rounded-xl border-2 border-dashed transition-colors',
            isDragTarget
              ? 'border-[var(--accent)]/50 bg-[var(--accent-muted)]/20 text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--text-3)]'
          )}>
            <span className="text-[11px]">
              {isDragTarget ? 'Drop here' : 'No tasks'}
            </span>
          </div>
        )}

        {tasks.map((issue) => (
          <TaskCard
            key={`${issue.project_id}_${issue.iid}`}
            issue={issue}
            status={status.id}
            isDragging={draggingIssueId === `${issue.project_id}_${issue.iid}`}
            onDragStart={() => onDragStart(issue, status.id)}
            onEdit={onEdit}
            globalLabels={globalLabels}
          />
        ))}

        {/* Drop Zone at bottom when dragging from another column */}
        {isDragTarget && tasks.length > 0 && draggingStatus !== status.id && (
          <div className="h-16 rounded-xl border-2 border-dashed border-[var(--accent)]/40 bg-[var(--accent-muted)]/10 flex items-center justify-center">
            <span className="text-[11px] text-[var(--accent)]">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}

export interface BoardViewProps {
  onEdit: (issue: any) => void;
}

// ── Board View ─────────────────────────────────────────────────────────────────
export default function BoardView({ onEdit }: BoardViewProps) {
  const {
    issues, customStatuses, globalLabels,
    filterProjects, filterStatus, filterLabels, assignedToMe, globalFilter,
    projectOverrides, currentUser,
    appSettings, updateAppSettings,
    setTaskStatus,
  } = useStore();

  const toast = useToast();

  const [dragging, setDragging] = useState<{ issue: any; fromStatus: string } | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showColMenu, setShowColMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Close column menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false);
      }
    }
    if (showColMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColMenu]);

  // Board columns configured in settings
  const activeColumnIds = useMemo(() => {
    const cols = appSettings?.boardColumns;
    if (Array.isArray(cols) && cols.length > 0) return cols;
    return TASK_STATUSES.map((s) => s.id);
  }, [appSettings?.boardColumns]);

  const visibleStatuses = useMemo(() => {
    return TASK_STATUSES.filter((s) => activeColumnIds.includes(s.id));
  }, [activeColumnIds]);

  const toggleColumn = useCallback((statusId: string) => {
    let next: string[];
    if (activeColumnIds.includes(statusId)) {
      if (activeColumnIds.length <= 1) {
        toast({ type: 'warning', message: 'At least one column must remain visible' });
        return;
      }
      next = activeColumnIds.filter((id) => id !== statusId);
    } else {
      next = [...activeColumnIds, statusId];
    }
    updateAppSettings({ boardColumns: next });
  }, [activeColumnIds, updateAppSettings, toast]);

  const resetColumns = useCallback(() => {
    updateAppSettings({ boardColumns: TASK_STATUSES.map((s) => s.id) });
    toast({ type: 'info', message: 'All board columns restored' });
  }, [updateAppSettings, toast]);

  // Apply same filters as table view
  const filteredIssues = useMemo(() => {
    let result = issues;

    // Enabled projects only
    result = result.filter((i) => {
      const override = projectOverrides?.[String(i.project_id)];
      return override?.enabled !== false;
    });

    // Project filter
    if (filterProjects && filterProjects.length > 0) {
      result = result.filter((i) => filterProjects.includes(String(i.project_id)));
    }

    // Status filter
    const filterStatusArr = Array.isArray(filterStatus) ? filterStatus : [];
    if (filterStatusArr.length > 0) {
      result = result.filter((i) => filterStatusArr.includes(getEffectiveStatus(i, customStatuses)));
    }

    // Label filter
    if (filterLabels && filterLabels.length > 0) {
      result = result.filter((i) => {
        const labelNames = (i.labels || []).map((l: any) => (typeof l === 'string' ? l : l?.name)).filter(Boolean);
        return filterLabels.some((fl) => labelNames.some((ln: string) => ln.toLowerCase() === fl.toLowerCase()));
      });
    }

    // Assigned to me
    if (assignedToMe && currentUser) {
      result = result.filter((i) => {
        const assignees = i.assignees || (i.assignee ? [i.assignee] : []);
        return assignees.some((a: any) => a.id === currentUser.id);
      });
    }

    // Global search
    if (globalFilter?.trim()) {
      const q = globalFilter.toLowerCase();
      result = result.filter((i) =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        (i.labels || []).some((l: any) => (typeof l === 'string' ? l : l?.name)?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [issues, filterProjects, filterStatus, filterLabels, assignedToMe, globalFilter, customStatuses, projectOverrides, currentUser]);

  // Group by effective status
  const columnTasks = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of TASK_STATUSES) {
      map[s.id] = [];
    }
    for (const issue of filteredIssues) {
      const status = getEffectiveStatus(issue, customStatuses);
      if (map[status]) {
        map[status].push(issue);
      } else {
        map['open'].push(issue);
      }
    }
    return map;
  }, [filteredIssues, customStatuses]);

  const handleDragStart = useCallback((issue: any, fromStatus: string) => {
    setDragging({ issue, fromStatus });
  }, []);

  const handleDragOver = useCallback((statusId: string) => {
    setDragTarget(statusId);
  }, []);

  const handleDragLeave = useCallback(() => {
    // Keep target until drop or another dragover
  }, []);

  const handleDrop = useCallback(async (toStatus: string) => {
    if (!dragging) return;
    const { issue, fromStatus } = dragging;
    setDragging(null);
    setDragTarget(null);

    if (fromStatus === toStatus) return;

    setUpdatingStatus(toStatus);
    try {
      await setTaskStatus(issue.project_id, issue.iid, toStatus);
      toast({ type: 'success', message: `✓ Moved to ${TASK_STATUSES.find((s) => s.id === toStatus)?.label || toStatus}` });
    } catch (err: any) {
      toast({ type: 'error', message: `Failed to move task: ${err.message}` });
    } finally {
      setUpdatingStatus(null);
    }
  }, [dragging, setTaskStatus, toast]);

  const draggingId = dragging ? `${dragging.issue.project_id}_${dragging.issue.iid}` : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Sub-header: Column controls & board stats ── */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-1)]">Board View</span>
          <span className="text-[11px] text-[var(--text-3)] font-mono">
            {filteredIssues.length} task{filteredIssues.length === 1 ? '' : 's'} across {visibleStatuses.length} column{visibleStatuses.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Column selector dropdown */}
        <div className="relative" ref={colMenuRef}>
          <button
            type="button"
            onClick={() => setShowColMenu((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>Columns ({visibleStatuses.length}/{TASK_STATUSES.length})</span>
          </button>

          {showColMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl z-50 animate-scale-in">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--border)]">
                <span className="text-[11px] font-semibold text-[var(--text-1)]">Visible Columns</span>
                <button
                  type="button"
                  onClick={resetColumns}
                  className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Show all
                </button>
              </div>

              <div className="space-y-1">
                {TASK_STATUSES.map((s) => {
                  const isVisible = activeColumnIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleColumn(s.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                        isVisible
                          ? 'bg-[var(--accent-muted)]/40 text-[var(--text-1)] font-medium'
                          : 'text-[var(--text-3)] hover:bg-[var(--surface-2)]'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span>{s.label}</span>
                      </div>
                      {isVisible && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Columns Scroll Area ── */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden"
        onDragEnd={() => { setDragging(null); setDragTarget(null); }}
      >
        <div className="flex gap-4 px-5 py-4 h-full min-w-max">
          {visibleStatuses.map((status) => (
            <BoardColumn
              key={status.id}
              status={status}
              tasks={columnTasks[status.id] || []}
              onEdit={onEdit}
              globalLabels={globalLabels || []}
              draggingIssueId={draggingId}
              draggingStatus={dragging?.fromStatus}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              isDragTarget={dragTarget === status.id && dragging?.fromStatus !== status.id}
              isUpdating={updatingStatus === status.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  GripVertical, Loader2, SlidersHorizontal, Check, List, Kanban,
} from 'lucide-react';
import { cn } from '../lib/utils';
import useStore from '../store/useStore';
import {
  TASK_STATUSES, getEffectiveStatus, compareTaskSequence,
  type TaskStatus, type BoardVisibleColumns,
} from '../lib/localStore';
import { Button } from './ui/index';
import { DropdownMenu, DropdownItem, DropdownSeparator, useToast } from './ui/overlay';

const BOARD_FIELDS: { key: keyof BoardVisibleColumns; label: string }[] = [
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status Dot' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'labels', label: 'Labels' },
  { key: 'assignees', label: 'Assignees' },
];

// Inline mini-avatar
function MiniAvatar({ src, name, size = 20 }: { src?: string | null; name?: string | null; size?: number }) {
  const [errored, setErrored] = React.useState(false);
  const initials = (name || '?').split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  const hue = ((name || '').charCodeAt(0) * 7) % 360;
  return src && !errored ? (
    <img src={src} alt={name || 'Avatar'} onError={() => setErrored(true)}
      draggable={false}
      style={{ width: size, height: size }}
      className="rounded-full object-cover border-2 border-[var(--surface)] select-none pointer-events-none"
    />
  ) : (
    <div style={{ width: size, height: size, background: `hsl(${hue}, 50%, 40%)` }}
      className="rounded-full border-2 border-[var(--surface)] flex items-center justify-center text-white font-bold text-[9px] select-none pointer-events-none"
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
  if (diffDays <= 3) return { text: `Due in ${diffDays}d`, cls: 'bg-amber-500/15 text-amber-500 border-amber-500/20' };
  return { text: `Due ${diffDays}d`, cls: 'bg-[var(--surface-3)] text-[var(--text-3)] border-[var(--border)]' };
}

interface TaskCardProps {
  issue: any;
  status: string;
  isDragging: boolean;
  dragOverPos?: 'before' | 'after' | null;
  onDragStart: (e: React.DragEvent, issue: any, status: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onEdit: (issue: any) => void;
  globalLabels: any[];
  visibleColumns: BoardVisibleColumns;
  projectName?: string;
}

// ── Task Card ──────────────────────────────────────────────────────────────────
const TaskCard = React.memo(
  function TaskCard({
    issue, status, isDragging, dragOverPos,
    onDragStart, onDragEnd,
    onEdit, globalLabels, visibleColumns, projectName
  }: TaskCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const dueInfo = getDueInfo(issue.due_date);
    const assignees = issue.assignees || (issue.assignee ? [issue.assignee] : []);
    const labelNames = (issue.labels || []).map((l: any) => (typeof l === 'string' ? l : l?.name)).filter(Boolean);
    const visibleLabels = labelNames
      .map((name: string) => globalLabels.find((g) => g.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean)
      .slice(0, 3);

    const statusInfo = TASK_STATUSES.find((s) => s.id === status);
    const cardKey = `${issue.project_id}_${issue.iid}`;

    return (
      <div
        ref={cardRef}
        data-task-card-key={cardKey}
        draggable
        onDragStart={(e) => onDragStart(e, issue, status)}
        onDragEnd={onDragEnd}
        className={cn(
          'group relative p-3 rounded-xl border bg-[var(--surface)] shadow-xs select-none',
          'cursor-grab active:cursor-grabbing transition-all duration-150',
          'hover:border-[var(--accent)]/40 hover:shadow-md',
          isDragging
            ? 'opacity-30 scale-95 border-[var(--accent)] pointer-events-none'
            : 'border-[var(--border)] hover:translate-y-[-1px]',
          dragOverPos === 'before' && '!border-t-[var(--accent)] shadow-md',
          dragOverPos === 'after' && '!border-b-[var(--accent)] shadow-md'
        )}
        onClick={() => onEdit(issue)}
      >
        {/* Crisp illuminated drop indicator line */}
        {dragOverPos === 'before' && (
          <div className="absolute -top-[5px] left-1 right-1 h-[3px] bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)] z-30 pointer-events-none" />
        )}
        {dragOverPos === 'after' && (
          <div className="absolute -bottom-[5px] left-1 right-1 h-[3px] bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)] z-30 pointer-events-none" />
        )}

        {/* Status dot & Project */}
        <div className="flex items-start justify-between gap-2 mb-2 pointer-events-none">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {visibleColumns.status && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: statusInfo?.color || '#64748b' }}
              />
            )}
            <span className="text-[10px] text-[var(--text-3)] font-mono shrink-0">
              #{issue.iid}
            </span>
            {visibleColumns.project && projectName && (
              <span
                className="text-[9px] font-medium text-[var(--text-2)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded border border-[var(--border)] truncate max-w-[120px]"
                title={projectName}
              >
                {projectName}
              </span>
            )}
          </div>
          <GripVertical className="h-3.5 w-3.5 text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
        </div>

        {/* Title */}
        <p
          className="text-xs font-medium text-[var(--text-1)] leading-relaxed line-clamp-2 mb-2.5 pointer-events-none"
          title={issue.title}
        >
          {issue.title}
        </p>

        {/* Labels */}
        {visibleColumns.labels && visibleLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5 pointer-events-none">
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
        {((visibleColumns.dueDate && dueInfo) || (visibleColumns.assignees && assignees.length > 0)) && (
          <div className="flex items-center justify-between gap-2 mt-auto pointer-events-none">
            <div className="flex items-center gap-1.5">
              {visibleColumns.dueDate && dueInfo && (
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-medium', dueInfo.cls)}>
                  {dueInfo.text}
                </span>
              )}
            </div>
            {visibleColumns.assignees && assignees.length > 0 && (
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
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.issue === next.issue &&
      prev.status === next.status &&
      prev.isDragging === next.isDragging &&
      prev.dragOverPos === next.dragOverPos &&
      prev.globalLabels === next.globalLabels &&
      prev.visibleColumns === next.visibleColumns &&
      prev.projectName === next.projectName
    );
  }
);

// ── Drop placement calculation helper ──────────────────────────────────────────
function getColumnDropPlacement(
  containerEl: HTMLElement | null,
  clientY: number,
  columnTasks: any[],
  draggedKey: string
): { targetKey: string | null; pos: 'before' | 'after' } {
  const otherTasks = columnTasks.filter(
    (t) => `${t.project_id}_${t.iid}` !== draggedKey
  );

  if (otherTasks.length === 0) {
    return { targetKey: null, pos: 'after' };
  }

  if (!containerEl) {
    const last = otherTasks[otherTasks.length - 1];
    return { targetKey: `${last.project_id}_${last.iid}`, pos: 'after' };
  }

  const cardEls = Array.from(
    containerEl.querySelectorAll<HTMLElement>('[data-task-card-key]')
  ).filter((el) => el.getAttribute('data-task-card-key') !== draggedKey);

  if (cardEls.length === 0) {
    const last = otherTasks[otherTasks.length - 1];
    return { targetKey: `${last.project_id}_${last.iid}`, pos: 'after' };
  }

  for (let i = 0; i < cardEls.length; i++) {
    const el = cardEls[i];
    const key = el.getAttribute('data-task-card-key');
    if (!key) continue;
    const rect = el.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (clientY < midY) {
      return { targetKey: key, pos: 'before' };
    }
  }

  const lastEl = cardEls[cardEls.length - 1];
  const lastKey = lastEl.getAttribute('data-task-card-key')!;
  return { targetKey: lastKey, pos: 'after' };
}

interface BoardColumnProps {
  status: TaskStatus;
  tasks: any[];
  onEdit: (issue: any) => void;
  globalLabels: any[];
  draggingIssueId: string | null;
  draggingStatus?: string;
  dragOverTarget?: { key: string; pos: 'before' | 'after' } | null;
  onDragStart: (e: React.DragEvent, issue: any, statusId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onColumnDragOver: (e: React.DragEvent, statusId: string, containerEl: HTMLElement | null) => void;
  onColumnDragLeave: (e: React.DragEvent, statusId: string) => void;
  onColumnDrop: (e: React.DragEvent, statusId: string, containerEl: HTMLElement | null) => void;
  isDragTarget: boolean;
  isUpdating: boolean;
  visibleColumns: BoardVisibleColumns;
  projectMap: Record<string | number, any>;
}

// ── Column ──────────────────────────────────────────────────────────────────────
const BoardColumn = React.memo(function BoardColumn({
  status, tasks, onEdit, globalLabels,
  draggingIssueId, draggingStatus, dragOverTarget,
  onDragStart, onDragEnd,
  onColumnDragOver, onColumnDragLeave, onColumnDrop,
  isDragTarget,
  isUpdating,
  visibleColumns,
  projectMap,
}: BoardColumnProps) {
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const taskCount = tasks.length;

  return (
    <div
      className={cn(
        'flex flex-col w-[280px] shrink-0 rounded-2xl border transition-all duration-150 h-full max-h-full select-none',
        isDragTarget
          ? 'border-[var(--accent)] bg-[var(--accent-muted)]/20 shadow-lg shadow-[var(--accent)]/10 ring-2 ring-[var(--accent)]/30'
          : 'border-[var(--border)] bg-[var(--surface-2)]/60'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onColumnDragOver(e, status.id, cardsContainerRef.current);
      }}
      onDragLeave={(e) => {
        onColumnDragLeave(e, status.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onColumnDrop(e, status.id, cardsContainerRef.current);
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0 pointer-events-none">
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

      {/* Cards - The entire status list is the drop zone */}
      <div
        ref={cardsContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 flex flex-col"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onColumnDragOver(e, status.id, cardsContainerRef.current);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onColumnDrop(e, status.id, cardsContainerRef.current);
        }}
      >
        {tasks.length === 0 ? (
          <div
            className={cn(
              'flex-1 min-h-[160px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-colors pointer-events-none',
              isDragTarget
                ? 'border-[var(--accent)] bg-[var(--accent-muted)]/30 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--text-3)]'
            )}
          >
            <span className="text-xs font-medium">
              {isDragTarget ? 'Drop task in this status' : 'No tasks'}
            </span>
          </div>
        ) : (
          <>
            {tasks.map((issue) => {
              const key = `${issue.project_id}_${issue.iid}`;
              return (
                <TaskCard
                  key={key}
                  issue={issue}
                  status={status.id}
                  isDragging={draggingIssueId === key}
                  dragOverPos={dragOverTarget?.key === key ? dragOverTarget.pos : null}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onEdit={onEdit}
                  globalLabels={globalLabels}
                  visibleColumns={visibleColumns}
                  projectName={projectMap[issue.project_id]?.name}
                />
              );
            })}

            {/* Flexible drop zone spacer spanning the rest of the column list */}
            <div
              className={cn(
                'flex-1 min-h-[60px] rounded-xl transition-all duration-150 pointer-events-none',
                isDragTarget && draggingStatus !== status.id
                  ? 'border-2 border-dashed border-[var(--accent)]/40 bg-[var(--accent-muted)]/15'
                  : 'border border-transparent'
              )}
            />
          </>
        )}
      </div>
    </div>
  );
});

export interface BoardViewProps {
  onEdit: (issue: any) => void;
}

// ── Board View ─────────────────────────────────────────────────────────────────
export default function BoardView({ onEdit }: BoardViewProps) {
  const {
    issues, projects, customStatuses, globalLabels,
    filterProjects, filterStatus, filterLabels, assignedToMe, globalFilter,
    projectOverrides, currentUser,
    boardStatuses,
    setTaskStatus,
    taskSequence, reorderTaskSequence, setTaskSequence,
    boardVisibleColumns, toggleBoardColumn, resetBoardVisibleColumns,
    appSettings,
    viewMode, setViewMode,
  } = useStore();

  const toast = useToast();

  const draggingRef = useRef<{ issue: any; fromStatus: string } | null>(null);
  const [dragging, setDragging] = useState<{ issue: any; fromStatus: string } | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ key: string; pos: 'before' | 'after' } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showColMenu, setShowColMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Close columns dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false);
      }
    }
    if (showColMenu) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [showColMenu]);

  const projectMap = useMemo(() => {
    const map: Record<string | number, any> = {};
    (projects || []).forEach((p) => { map[p.id] = p; });
    return map;
  }, [projects]);

  // Board columns configured in settings
  const visibleStatuses = useMemo(() => {
    const enabled = boardStatuses.filter((s) => s.enabled);
    return enabled.length > 0 ? enabled : boardStatuses;
  }, [boardStatuses]);

  const activeFieldCount = Object.values(boardVisibleColumns).filter(Boolean).length;

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

  const sequenceMap = useMemo(() => {
    const map = new Map<string, number>();
    (taskSequence || []).forEach((k, idx) => map.set(k, idx));
    return map;
  }, [taskSequence]);

  // Group by effective status and sort by manual sequence
  const columnTasks = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of boardStatuses) {
      map[s.id] = [];
    }
    for (const issue of filteredIssues) {
      const status = getEffectiveStatus(issue, customStatuses);
      if (map[status]) {
        map[status].push(issue);
      } else {
        if (map['open']) {
          map['open'].push(issue);
        } else if (boardStatuses[0]) {
          map[boardStatuses[0].id].push(issue);
        }
      }
    }
    // Sort each column's tasks according to sequenceMap
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => compareTaskSequence(a, b, sequenceMap));
    }
    return map;
  }, [filteredIssues, customStatuses, boardStatuses, sequenceMap]);

  // Compute all visible tasks in current board visual sequence order
  const allVisibleKeys = useMemo(() => {
    const keys: string[] = [];
    visibleStatuses.forEach((st) => {
      (columnTasks[st.id] || []).forEach((i) => {
        keys.push(`${i.project_id}_${i.iid}`);
      });
    });
    const set = new Set(keys);
    filteredIssues.forEach((i) => {
      const k = `${i.project_id}_${i.iid}`;
      if (!set.has(k)) keys.push(k);
    });
    return keys;
  }, [visibleStatuses, columnTasks, filteredIssues]);

  const handleDragStart = useCallback((e: React.DragEvent, issue: any, fromStatus: string) => {
    const key = `${issue.project_id}_${issue.iid}`;
    const dragData = { issue, fromStatus };
    setDragging(dragData);
    draggingRef.current = dragData;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    draggingRef.current = null;
    setDragTarget(null);
    setDragOverTarget(null);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, toStatus: string, containerEl: HTMLElement | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const currentDragging = draggingRef.current || dragging;
    if (!currentDragging) return;

    const draggedKey = `${currentDragging.issue.project_id}_${currentDragging.issue.iid}`;
    const tasks = columnTasks[toStatus] || [];
    const placement = getColumnDropPlacement(containerEl, e.clientY, tasks, draggedKey);

    setDragTarget(toStatus);
    setDragOverTarget((prev) => {
      if (prev?.key === placement.targetKey && prev?.pos === placement.pos) {
        return prev;
      }
      return placement.targetKey ? { key: placement.targetKey, pos: placement.pos } : null;
    });
  }, [dragging, columnTasks]);

  const handleColumnDragLeave = useCallback((e: React.DragEvent, statusId: string) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDragTarget((prev) => (prev === statusId ? null : prev));
      setDragOverTarget(null);
    }
  }, []);

  const handleColumnDrop = useCallback(async (e: React.DragEvent, toStatus: string, containerEl: HTMLElement | null) => {
    e.preventDefault();
    e.stopPropagation();

    const currentDragging = draggingRef.current || dragging;
    if (!currentDragging) return;

    const { issue, fromStatus } = currentDragging;
    const draggedKey = `${issue.project_id}_${issue.iid}`;

    const tasks = columnTasks[toStatus] || [];
    const placement = getColumnDropPlacement(containerEl, e.clientY, tasks, draggedKey);

    // Reset dragging UI indicators immediately
    setDragging(null);
    draggingRef.current = null;
    setDragTarget(null);
    setDragOverTarget(null);

    const prevSeq = [...taskSequence];
    const isStatusChanged = fromStatus !== toStatus;

    // Apply sequence reorder immediately
    reorderTaskSequence(draggedKey, placement.targetKey, placement.pos, allVisibleKeys);

    if (isStatusChanged) {
      setUpdatingStatus(toStatus);
      const undoPeriod = appSettings?.undoPeriod !== undefined ? appSettings.undoPeriod : 5;
      try {
        await setTaskStatus(issue.project_id, issue.iid, toStatus);
        const stObj = boardStatuses.find((s) => s.id === toStatus);
        const fromObj = boardStatuses.find((s) => s.id === fromStatus);
        if (undoPeriod > 0) {
          toast.success(`Moved to ${stObj?.label || toStatus}`, {
            duration: undoPeriod * 1000,
            action: {
              label: 'Undo',
              onClick: async () => {
                await setTaskStatus(issue.project_id, issue.iid, fromStatus);
                setTaskSequence(prevSeq);
                toast.info(`Moved back to ${fromObj?.label || fromStatus}`);
              },
            },
          });
        } else {
          toast.success(`Moved to ${stObj?.label || toStatus}`);
        }
      } catch (err: any) {
        toast.error(`Failed to move task: ${err.message}`);
        setTaskSequence(prevSeq);
      } finally {
        setUpdatingStatus(null);
      }
    } else {
      // Reordering within the same column
      if (placement.targetKey && placement.targetKey !== draggedKey) {
        const undoPeriod = appSettings?.undoPeriod !== undefined ? appSettings.undoPeriod : 5;
        if (undoPeriod > 0) {
          toast.success('Sequence updated', {
            duration: undoPeriod * 1000,
            action: {
              label: 'Undo',
              onClick: () => {
                setTaskSequence(prevSeq);
                toast.info('Sequence restored');
              },
            },
          });
        } else {
          toast.success('Sequence updated');
        }
      }
    }
  }, [dragging, columnTasks, allVisibleKeys, setTaskStatus, boardStatuses, reorderTaskSequence, taskSequence, setTaskSequence, toast, appSettings?.undoPeriod]);

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

        {/* Right controls: View Mode Switcher + Visible Columns */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
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
              type="button"
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

          {/* Visible Columns dropdown */}
          <div className="relative" ref={colMenuRef}>
            <button
              type="button"
              onClick={() => setShowColMenu((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Visible Columns ({activeFieldCount}/{BOARD_FIELDS.length})</span>
            </button>

            {showColMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl z-50 animate-scale-in">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--border)]">
                  <span className="text-[11px] font-semibold text-[var(--text-1)]">Visible Columns</span>
                  <button
                    type="button"
                    onClick={resetBoardVisibleColumns}
                    className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Reset all
                  </button>
                </div>

                <div className="space-y-1">
                  {BOARD_FIELDS.map((f) => {
                    const isVisible = boardVisibleColumns[f.key];
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => toggleBoardColumn(f.key)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                          isVisible
                            ? 'bg-[var(--accent-muted)]/40 text-[var(--text-1)] font-medium'
                            : 'text-[var(--text-3)] hover:bg-[var(--surface-2)]'
                        )}
                      >
                        <span>{f.label}</span>
                        {isVisible && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
              dragOverTarget={dragOverTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onColumnDragOver={handleColumnDragOver}
              onColumnDragLeave={handleColumnDragLeave}
              onColumnDrop={handleColumnDrop}
              isDragTarget={dragTarget === status.id && dragging?.fromStatus !== status.id}
              isUpdating={updatingStatus === status.id}
              visibleColumns={boardVisibleColumns}
              projectMap={projectMap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

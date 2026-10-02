import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  useReactTable, getCoreRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink,
  Edit2, Trash2, Check, X, ChevronLeft, ChevronRight,
  MoreHorizontal, CheckCircle2, Circle, Pin, PinOff,
  Tag, UserPlus, Calendar, Search, Plus, Loader2,
  Users, CheckSquare,
} from 'lucide-react';
import { Button, Badge, Avatar, Spinner } from './ui/index';
import { DropdownMenu, DropdownItem, DropdownSeparator, useConfirm } from './ui/overlay';
import { useToast } from './ui/overlay';
import useStore from '../store/useStore';
import { cn, formatDate, getDueDateInfo, getDueDateBadgeClass, getVisibleGlobalLabels } from '../lib/utils';
import { TASK_STATUSES, getEffectiveStatus } from '../lib/localStore';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
  '#14b8a6', '#84cc16'
];

interface FloatingPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingPopover — portal-based so it escapes overflow:auto containers
// ─────────────────────────────────────────────────────────────────────────────
function FloatingPopover({ anchorRef, open, onClose, children, width = 240 }: FloatingPopoverProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    let top = r.bottom + 6;
    if (spaceBelow < 280 && spaceAbove > 280) top = r.top - 280 - 6;
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    setPos({ top, left });
  }, [open, anchorRef, width]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 animate-fade-in rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-modal)] overflow-hidden"
        style={{ top: pos.top, left: pos.left, width }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Due Date (Color coded: passed=red, same day=yellow/orange, upcoming=green)
// ─────────────────────────────────────────────────────────────────────────────
function InlineDueDate({ issue, onUpdate }: { issue: any; onUpdate: (payload: any) => Promise<void> }) {
  const { appSettings } = useStore();
  const ref = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const info = getDueDateInfo(issue.due_date, appSettings);

  const setPreset = async (days: number) => {
    setOpen(false);
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    await onUpdate({ due_date: dateStr });
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOpen(false);
    await onUpdate({ due_date: val || null });
  };

  const handleOpenPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((inputRef.current as any)?.showPicker) {
      try {
        (inputRef.current as any).showPicker();
        return;
      } catch {}
    }
    setOpen(true);
  };

  const badgeClass = getDueDateBadgeClass(info?.status);

  return (
    <div className="relative inline-flex items-center gap-1 group whitespace-nowrap flex-nowrap shrink-0">
      {/* Hidden native input for direct browser calendar picker */}
      <input
        ref={inputRef}
        type="date"
        value={issue.due_date || ''}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />

      <button
        ref={ref}
        type="button"
        onClick={handleOpenPicker}
        title={issue.due_date ? `Due: ${issue.due_date} (${info?.status}) — Click to change` : 'Click to pick date'}
        className={cn(
          'text-xs font-medium rounded-lg px-2 py-0.5 border transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap flex-nowrap shrink-0',
          issue.due_date
            ? badgeClass
            : 'border-dashed border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]'
        )}
      >
        <Calendar
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            info?.status === 'passed' && 'text-red-500',
            info?.status === 'today' && 'text-amber-500',
            info?.status === 'upcoming' && 'text-emerald-500',
            !issue.due_date && 'opacity-60'
          )}
        />
        {info ? <span className="whitespace-nowrap">{info.text}</span> : <span className="text-[11px] whitespace-nowrap">+ Date</span>}
      </button>

      {/* Quick clear button on hover */}
      {issue.due_date && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ due_date: null });
          }}
          title="Clear due date"
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-3)] hover:text-red-500 transition-all cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Floating Popover with presets and calendar picker */}
      <FloatingPopover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={240}>
        <div className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--text-1)]">Due Date Picker</p>
            {issue.due_date && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium border', badgeClass)}>
                {info?.status === 'passed' ? 'Overdue' : info?.status === 'today' ? 'Today' : 'Upcoming'}
              </span>
            )}
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setPreset(0)}
              className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPreset(1)}
              className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setPreset(7)}
              className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              Next Week
            </button>
          </div>

          <div>
            <label className="text-[10px] font-medium text-[var(--text-3)] mb-1 block">Pick exact date</label>
            <input
              type="date"
              defaultValue={issue.due_date || ''}
              onChange={handleChange}
              onClick={(e: any) => { try { e.target.showPicker?.(); } catch {} }}
              className="w-full h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]/60 [color-scheme:dark] cursor-pointer"
              autoFocus
            />
          </div>

          {issue.due_date && (
            <button
              type="button"
              onClick={() => { onUpdate({ due_date: null }); setOpen(false); }}
              className="w-full text-xs text-red-500 hover:bg-red-500/10 py-1 rounded-lg transition-colors cursor-pointer text-center font-medium"
            >
              Clear due date
            </button>
          )}
        </div>
      </FloatingPopover>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Assignee Picker
// ─────────────────────────────────────────────────────────────────────────────
function InlineAssignee({ issue, onUpdate }: { issue: any; onUpdate: (payload: any) => Promise<void> }) {
  const ref     = useRef<HTMLButtonElement>(null);
  const [open,    setOpen]    = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchMembersForProject, currentUser } = useStore();

  const assignees = issue.assignees || [];

  useEffect(() => {
    if (!open) return;
    setLoading(true); setSearch('');
    fetchMembersForProject(issue.project_id)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [open, issue.project_id, fetchMembersForProject]);

  const isAssigned  = (m: any) => assignees.some((a: any) => a.id === m.id);
  const filteredM   = members.filter((m: any) =>
    (m.name || m.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggle = async (member: any) => {
    const newIds = isAssigned(member)
      ? assignees.filter((a: any) => a.id !== member.id).map((a: any) => a.id)
      : [...assignees.map((a: any) => a.id), member.id];
    const newAssignees = isAssigned(member)
      ? assignees.filter((a: any) => a.id !== member.id)
      : [...assignees, member];
    await onUpdate({ assignee_ids: newIds, assignees: newAssignees });
  };

  const assignMe = async () => {
    if (!currentUser) return;
    const already = assignees.some((a: any) => a.id === currentUser.id);
    const newIds = already
      ? assignees.filter((a: any) => a.id !== currentUser.id).map((a: any) => a.id)
      : [...assignees.map((a: any) => a.id), currentUser.id];
    const newAssignees = already
      ? assignees.filter((a: any) => a.id !== currentUser.id)
      : [...assignees, currentUser];
    await onUpdate({ assignee_ids: newIds, assignees: newAssignees });
    setOpen(false);
  };

  return (
    <>
      <button
        ref={ref}
        onClick={() => setOpen(true)}
        className="flex items-center -space-x-1.5 hover:opacity-80 transition-opacity group cursor-pointer"
        title="Click to edit assignees"
      >
        {assignees.length === 0 ? (
          <div className="flex items-center gap-1 text-[var(--text-3)] text-xs group-hover:text-[var(--text-2)] transition-colors">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="text-[10px]">Assign</span>
          </div>
        ) : (
          <>
            {assignees.slice(0, 3).map((a: any) => (
              <Avatar key={a.id} src={a.avatar_url} name={a.name || a.username} size="sm" className="ring-1 ring-[var(--bg)]" />
            ))}
            {assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--text-2)] ring-1 ring-[var(--bg)]">+{assignees.length - 3}</div>
            )}
          </>
        )}
      </button>
      <FloatingPopover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={240}>
        <div>
          <div className="px-3 py-2.5 border-b border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text-2)] mb-2">Assignees</p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-3)]" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                autoFocus
                className="w-full h-7 pl-6 pr-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]/50"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {/* Assign me shortcut */}
            {currentUser && (
              <button
                onClick={assignMe}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] cursor-pointer"
              >
                <Avatar src={currentUser.avatar_url} name={currentUser.name} size="sm" />
                <span className="flex-1 text-left text-[var(--text-1)]">Assign to me</span>
                {assignees.some((a: any) => a.id === currentUser.id) && <Check className="h-3 w-3 text-[var(--accent)]" />}
              </button>
            )}

            {loading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : filteredM.length === 0 ? (
              <p className="text-xs text-[var(--text-3)] text-center py-3">No members found</p>
            ) : (
              filteredM.map((m: any) => {
                const assigned = isAssigned(m);
                const isMe     = currentUser?.id === m.id;
                if (isMe) return null; // already shown above
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                  >
                    <Avatar src={m.avatar_url} name={m.name || m.username} size="sm" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[var(--text-1)] truncate">{m.name || m.username}</p>
                      <p className="text-[var(--text-3)] text-[10px]">@{m.username}</p>
                    </div>
                    {assigned && <Check className="h-3 w-3 text-[var(--accent)] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </FloatingPopover>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Label Picker (with inline create)
// ─────────────────────────────────────────────────────────────────────────────
function InlineLabel({ issue }: { issue: any }) {
  const ref     = useRef<HTMLButtonElement>(null);
  const [open,        setOpen]        = useState(false);
  const [search,      setSearch]      = useState('');
  const [newColor,    setNewColor]    = useState('#7c5cfc');
  const [creating,    setCreating]    = useState(false);
  const [draftLabels, setDraftLabels] = useState<any[]>([]);
  const [saving,      setSaving]      = useState(false);
  const { globalLabels, addGlobalLabel, batchUpdateIssueGlobalLabels } = useStore();

  const visibleLabels = getVisibleGlobalLabels(issue.labels, globalLabels);

  useEffect(() => {
    if (open) {
      setDraftLabels(visibleLabels);
      setSearch('');
    }
  }, [open]);

  const handleApplyAndClose = async () => {
    setOpen(false);
    const curKeys   = visibleLabels.map((l: any) => l.name.toLowerCase()).sort().join(',');
    const draftKeys = draftLabels.map((l: any) => l.name.toLowerCase()).sort().join(',');
    if (curKeys !== draftKeys) {
      setSaving(true);
      try {
        await batchUpdateIssueGlobalLabels(issue, draftLabels);
      } catch (e) {
        console.error('Failed to batch update labels:', e);
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleDraft = (label: any) => {
    setDraftLabels((prev) => {
      const exists = prev.some((l) => l.name.toLowerCase() === label.name.toLowerCase());
      if (exists) {
        return prev.filter((l) => l.name.toLowerCase() !== label.name.toLowerCase());
      } else {
        return [...prev, label];
      }
    });
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    setCreating(true);
    try {
      const created = addGlobalLabel({ name: search.trim(), color: newColor });
      setDraftLabels((prev) => [...prev, created]);
      setSearch('');
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const filtered   = globalLabels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
  const exact      = globalLabels.find((l) => l.name.toLowerCase() === search.trim().toLowerCase());
  const isSelected = (l: any) => draftLabels.some((dl) => dl.name.toLowerCase() === l.name.toLowerCase());

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 flex-wrap min-h-[24px] group text-left cursor-pointer"
        title="Manage global labels"
      >
        {saving ? (
          <span className="flex items-center gap-1 text-[10px] text-[var(--accent)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </span>
        ) : visibleLabels.length === 0 ? (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">
            <Tag className="h-3 w-3" /> Add tag
          </span>
        ) : (
          <>
            {visibleLabels.slice(0, 2).map((l: any) => (
              <Badge
                key={l.id || l.name}
                className="text-[10px] px-1.5 py-0.5 border transition-all duration-200 hover:scale-105 active:scale-95 animate-tag-badge"
                style={{
                  background: `${l.color}1f`,
                  color: l.color,
                  borderColor: `${l.color}40`,
                }}
              >
                {l.name}
              </Badge>
            ))}
            {visibleLabels.length > 2 && (
              <span className="text-[10px] text-[var(--text-3)]">
                +{visibleLabels.length - 2}
              </span>
            )}
          </>
        )}
      </button>

      <FloatingPopover anchorRef={ref} open={open} onClose={handleApplyAndClose} width={260}>
        <div>
          <div className="px-3 py-2.5 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--text-1)]">Global Labels</p>
              <span className="text-[10px] text-[var(--text-3)]">Select multiple, saves on close</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-3)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or add global tag..."
                autoFocus
                className="w-full h-7 pl-6 pr-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]/50"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filtered.length > 0 ? (
              <div className="py-1">
                {filtered.map((label) => {
                  const sel = isSelected(label);
                  return (
                    <button
                      key={label.id || label.name}
                      type="button"
                      onClick={() => toggleDraft(label)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] transition-colors cursor-pointer',
                        sel && 'bg-[var(--surface-2)]/80 font-medium'
                      )}
                    >
                      <span
                        className={cn(
                          'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                          sel
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : 'border-[var(--border)] bg-[var(--surface)] text-transparent'
                        )}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs" style={{ background: label.color }} />
                      <span className="flex-1 text-left text-[var(--text-1)] truncate">{label.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Create option when search has text and no exact match */}
            {search.trim() && !exact && (
              <div className="border-t border-[var(--border)] p-2.5 bg-[var(--surface-2)]/40">
                <p className="text-[10px] text-[var(--text-3)] mb-1.5 font-medium">Create new global label</p>
                <div className="flex gap-1 mb-2.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        'h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer',
                        newColor === c ? 'border-white scale-110' : 'border-transparent'
                      )}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-4 w-4 rounded-full cursor-pointer border-0 p-0"
                    title="Custom color"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                >
                  {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Create & Select "{search.trim()}"
                </button>
              </div>
            )}

            {filtered.length === 0 && !search.trim() && (
              <p className="text-xs text-[var(--text-3)] text-center py-4">No global labels configured</p>
            )}
          </div>

          {/* Footer action to apply & close */}
          <div className="p-2 border-t border-[var(--border)] bg-[var(--surface-2)]/50 flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-3)]">
              {draftLabels.length} selected
            </span>
            <Button size="sm" onClick={handleApplyAndClose} className="h-6 text-xs px-3">
              Done
            </Button>
          </div>
        </div>
      </FloatingPopover>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Title
// ─────────────────────────────────────────────────────────────────────────────
function InlineTitle({ value, onSave }: { value: string; onSave: (val: string) => void; issueIid?: number | string }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, value]);

  const commit = useCallback(() => {
    const t = draft.trim();
    if (t && t !== value) {
      onSave(t);
    }
    setEditing(false);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  useEffect(() => {
    if (!editing) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commit();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [editing, commit]);

  if (editing) return (
    <div ref={containerRef} className="flex items-center gap-1 -mx-1">
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        className="flex-1 h-7 px-2 rounded-md border border-[var(--accent)]/50 bg-[var(--surface)] text-xs text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
      />
      <button
        onClick={commit}
        title="Save"
        className="h-7 w-7 rounded-md flex items-center justify-center bg-[var(--accent-muted)] text-[var(--accent)] hover:bg-[var(--accent)]/25 cursor-pointer"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={cancel}
        title="Cancel"
        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-[var(--surface-2)] text-[var(--text-3)] cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="group flex items-center gap-1.5 cursor-pointer" onClick={() => setEditing(true)}>
      <span className="text-sm text-[var(--text-1)] leading-tight line-clamp-2 flex-1">{value}</span>
      <Edit2 className="h-3 w-3 text-[var(--border)] group-hover:text-[var(--text-3)] opacity-0 group-hover:opacity-100 shrink-0 transition-all" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Cell (Selectable Dropdown)
// ─────────────────────────────────────────────────────────────────────────────
function StatusCell({ issue }: { issue: any }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { customStatuses, setTaskStatus } = useStore();

  const currentStatusId = getEffectiveStatus(issue, customStatuses);
  const currentStatus = TASK_STATUSES.find((s) => s.id === currentStatusId) || TASK_STATUSES[0];

  const handleSelect = async (statusId: string) => {
    setOpen(false);
    if (statusId === currentStatusId) return;
    setLoading(true);
    try {
      await setTaskStatus(issue.project_id, issue.iid, statusId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105 active:scale-95 animate-status-chip select-none cursor-pointer shadow-xs"
        style={{
          backgroundColor: `${currentStatus.color}15`,
          color: currentStatus.color,
          borderColor: `${currentStatus.color}35`,
        }}
      >
        {loading ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : (
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: currentStatus.color }} />
        )}
        <span>{currentStatus.label}</span>
        <ChevronDown className="h-2.5 w-2.5 opacity-60 ml-0.5" />
      </button>

      <FloatingPopover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={160}>
        <div className="p-1">
          <p className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-3)]">
            Change Status
          </p>
          <div className="space-y-0.5 mt-1">
            {TASK_STATUSES.map((s) => {
              const active = s.id === currentStatusId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                    active ? 'bg-[var(--surface-2)] font-semibold' : 'text-[var(--text-1)] hover:bg-[var(--surface-2)]'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span style={{ color: active ? s.color : undefined }}>{s.label}</span>
                  </span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: s.color }} />}
                </button>
              );
            })}
          </div>
        </div>
      </FloatingPopover>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton rows
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--border)]">
          {[20,300,100,100,120,100,40].map((w, j) => (
            <td key={j} className="px-4 py-3">
              <div className="animate-shimmer rounded bg-[var(--surface-2)] h-4" style={{ width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Action Bar
// ─────────────────────────────────────────────────────────────────────────────
interface BulkActionBarProps {
  selectedRows: any[];
  onClear: () => void;
  onCloseSelected: () => void;
  onAssignToMe: () => void;
  onOpenSelected: () => void;
}

function BulkActionBar({ selectedRows, onClear, onCloseSelected, onAssignToMe, onOpenSelected }: BulkActionBarProps) {
  const count = selectedRows.length;
  const openCount   = selectedRows.filter((r) => r.original.state === 'opened').length;
  const closedCount = selectedRows.filter((r) => r.original.state === 'closed').length;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--accent-muted)] border-b border-[var(--accent)]/20 animate-fade-in">
      <div className="flex items-center gap-2 shrink-0">
        <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
        <span className="text-sm font-semibold text-[var(--accent)]">{count} selected</span>
      </div>
      <div className="h-4 w-px bg-[var(--accent)]/20" />
      <div className="flex items-center gap-2 flex-1">
        {openCount > 0 && (
          <Button variant="secondary" size="sm" onClick={onCloseSelected}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Close {openCount > 1 ? `(${openCount})` : ''}
          </Button>
        )}
        {closedCount > 0 && (
          <Button variant="secondary" size="sm" onClick={onOpenSelected}>
            <Circle className="h-3.5 w-3.5" />
            Reopen {closedCount > 1 ? `(${closedCount})` : ''}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onAssignToMe}>
          <Users className="h-3.5 w-3.5" />
          Assign to me
        </Button>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onClear} title="Clear selection">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export interface TaskTableProps {
  onEdit?: (issue: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TaskTable
// ─────────────────────────────────────────────────────────────────────────────
export default function TaskTable({ onEdit }: TaskTableProps) {
  const {
    issues, issuesLoading, projects,
    globalFilter, filterProjects, filterStatus, filterLabels,
    updateTask, deleteTask, toggleTaskState,
    pinnedKeys, togglePin,
    bulkCloseIssues, bulkAssignToMe,
    globalLabels, appSettings, customStatuses,
  } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);

  const projectMap = useMemo(() => {
    const m: Record<string, any> = {};
    projects.forEach((p) => { m[p.id] = p; });
    return m;
  }, [projects]);

  // Apply filters + default sort: pinned tasks first, then created_at descending
  const filteredIssues = useMemo(() => {
    let data = issues;
    // Multi-select projects
    if (filterProjects && filterProjects.length > 0) {
      const projSet = new Set(filterProjects.map(String));
      data = data.filter((i) => projSet.has(String(i.project_id)));
    }
    // Multi-select status filter (checks effective status: open, close, ongoing, testing, pending, backlog)
    const activeStatuses = Array.isArray(filterStatus)
      ? filterStatus
      : (filterStatus && filterStatus !== 'all' ? [filterStatus] : []);
    if (activeStatuses.length > 0) {
      const statusSet = new Set(activeStatuses);
      data = data.filter((i) => statusSet.has(getEffectiveStatus(i, customStatuses)));
    }
    // Multi-select labels
    if (filterLabels && filterLabels.length > 0) {
      const labelSet = new Set(filterLabels.map((l) => l.toLowerCase()));
      data = data.filter((i) => {
        const issueLabels = getVisibleGlobalLabels(i.labels, globalLabels);
        return issueLabels.some((l) => labelSet.has(l.name.toLowerCase()));
      });
    }
    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      data = data.filter((i) =>
        i.title?.toLowerCase().includes(q) ||
        projectMap[i.project_id]?.name?.toLowerCase().includes(q) ||
        getVisibleGlobalLabels(i.labels, globalLabels).some((l) => l.name.toLowerCase().includes(q)) ||
        i.assignees?.some((a: any) => (a.name || a.username)?.toLowerCase().includes(q))
      );
    }
    const sortCol = sorting[0]?.id || 'created_at';
    const sortDesc = sorting[0]?.desc ?? true;

    // Pinned to top, then sorted by active sort column
    return [...data].sort((a, b) => {
      const aPinned = pinnedKeys.has(`${a.project_id}_${a.iid}`) ? 0 : 1;
      const bPinned = pinnedKeys.has(`${b.project_id}_${b.iid}`) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;

      let cmp = 0;
      if (sortCol === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else if (sortCol === 'due_date') {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
        cmp = aDate - bDate;
      } else if (sortCol === 'project') {
        const aP = projectMap[a.project_id]?.name || '';
        const bP = projectMap[b.project_id]?.name || '';
        cmp = aP.localeCompare(bP);
      } else if (sortCol === 'state') {
        const aSt = getEffectiveStatus(a, customStatuses);
        const bSt = getEffectiveStatus(b, customStatuses);
        cmp = aSt.localeCompare(bSt);
      } else {
        // default: created_at
        const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
        const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
        cmp = aTime - bTime;
      }

      return sortDesc ? -cmp : cmp;
    });
  }, [issues, filterProjects, filterStatus, filterLabels, globalFilter, projectMap, pinnedKeys, globalLabels, customStatuses, sorting]);

  const handleUpdate = useCallback(async (issue: any, payload: any) => {
    try { await updateTask(issue.project_id, issue.iid, payload); }
    catch (e: any) { toast({ type: 'error', message: e.message }); }
  }, [updateTask, toast]);

  const handleDelete = useCallback(async (issue: any) => {
    try { await deleteTask(issue.project_id, issue.iid); toast({ type: 'success', message: '✓ Deleted' }); }
    catch (e: any) { toast({ type: 'error', message: e.message }); }
  }, [deleteTask, toast]);

  const handleToggleState = useCallback(async (issue: any) => {
    try { await toggleTaskState(issue.project_id, issue.iid, issue.state); }
    catch (e: any) { toast({ type: 'error', message: e.message }); }
  }, [toggleTaskState, toast]);

  const columns: ColumnDef<any>[] = useMemo(() => [
    // ── Checkbox ──
    {
      id: 'select', size: 40, enableSorting: false,
      header: ({ table }) => (
        <input type="checkbox" className="h-4 w-4 rounded accent-[var(--accent)] cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="h-4 w-4 rounded accent-[var(--accent)] cursor-pointer"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    // ── Project ──
    {
      id: 'project', size: 155, enableSorting: true,
      header: 'Project',
      accessorFn: (row) => projectMap[row.project_id]?.name || `#${row.project_id}`,
      cell: ({ getValue, row }) => {
        const proj = projectMap[row.original.project_id];
        const hue  = (row.original.project_id * 137) % 360;
        const isPinned = pinnedKeys.has(`${row.original.project_id}_${row.original.iid}`);
        const val = getValue() as string;
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePin(row.original.project_id, row.original.iid);
              }}
              title={isPinned ? 'Unpin task (return to normal sort)' : 'Pin task to top'}
              className="p-1 -ml-1 rounded hover:bg-[var(--surface-3)] transition-transform duration-200 active:scale-75 cursor-pointer shrink-0"
            >
              {isPinned ? (
                <Pin className="h-3.5 w-3.5 text-[var(--accent)] animate-pin-pop" fill="currentColor" />
              ) : (
                <Pin className="h-3.5 w-3.5 text-[var(--text-3)] opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-[var(--accent)] transition-all duration-200 hover:rotate-12" />
              )}
            </button>
            {proj?.avatar_url ? (
              <img
                src={proj.avatar_url}
                alt=""
                className="h-5 w-5 rounded object-cover shrink-0 border border-[var(--border)]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div
              className={cn(
                'h-5 w-5 rounded shrink-0 flex items-center justify-center text-[9px] font-bold text-white',
                proj?.avatar_url && 'hidden'
              )}
              style={{ background: `hsl(${hue}, 55%, 35%)` }}
            >
              {(proj?.name || 'P')[0].toUpperCase()}
            </div>
            <span className="text-xs text-[var(--text-2)] truncate" title={val}>{val}</span>
          </div>
        );
      },
    },
    // ── Title ──
    {
      id: 'title', size: 300, enableSorting: true, header: 'Title', accessorKey: 'title',
      cell: ({ getValue, row }) => (
        <InlineTitle
          value={getValue() as string} issueIid={row.original.iid}
          onSave={(title) => handleUpdate(row.original, { title })}
        />
      ),
    },
    // ── Status ──
    {
      id: 'state', size: 125, header: 'Status', accessorKey: 'state',
      cell: ({ row }) => <StatusCell issue={row.original} />,
    },
    // ── Assignees ──
    {
      id: 'assignees', size: 110, header: 'Assignees',
      accessorFn: (row) => row.assignees?.map((a: any) => a.name).join(', ') || '',
      cell: ({ row }) => (
        <InlineAssignee issue={row.original}
          onUpdate={(payload) => handleUpdate(row.original, payload)} />
      ),
    },
    // ── Labels ──
    {
      id: 'labels', size: 160, header: 'Labels',
      accessorFn: (row) => getVisibleGlobalLabels(row.labels, globalLabels).map((l) => l.name).join(', ') || '',
      cell: ({ row }) => (
        <InlineLabel issue={row.original} />
      ),
    },
    // ── Due Date ──
    {
      id: 'due_date', size: 135, minSize: 125, header: 'Due Date', accessorKey: 'due_date',
      cell: ({ row }) => (
        <div className="whitespace-nowrap flex items-center">
          <InlineDueDate issue={row.original}
            onUpdate={(payload) => handleUpdate(row.original, payload)} />
        </div>
      ),
    },
    // ── Created At (Default Sort Column) ──
    {
      id: 'created_at', size: 105, header: 'Created', accessorKey: 'created_at',
      enableSorting: true,
      cell: ({ row }) => {
        const val = row.original.created_at || row.original.createdAt;
        if (!val) return <span className="text-xs text-[var(--text-3)]">—</span>;
        const formatted = formatDate(val, appSettings);
        return (
          <span
            className="text-xs text-[var(--text-3)] whitespace-nowrap"
            title={new Date(val).toLocaleString()}
          >
            {formatted?.text || val}
          </span>
        );
      },
    },
    // ── Actions ──
    {
      id: 'actions', size: 50, enableSorting: false, header: '',
      cell: ({ row }) => {
        const issue   = row.original;
        const pinned  = pinnedKeys.has(`${issue.project_id}_${issue.iid}`);
        return (
          <div className="flex items-center justify-end">
            <DropdownMenu
              trigger={<Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>}
              align="right"
            >
              <DropdownItem icon={Edit2} onClick={() => onEdit?.(issue)}>Edit Task</DropdownItem>
              {issue.web_url && <DropdownItem icon={ExternalLink} onClick={() => window.open(issue.web_url, '_blank')}>Open in GitLab</DropdownItem>}
              <DropdownSeparator />
              <DropdownItem icon={pinned ? PinOff : Pin} onClick={() => togglePin(issue.project_id, issue.iid)}>
                {pinned ? 'Unpin task' : 'Pin task'}
              </DropdownItem>
              <DropdownItem
                icon={issue.state === 'opened' ? CheckCircle2 : Circle}
                onClick={() => handleToggleState(issue)}
              >
                {issue.state === 'opened' ? 'Close Task' : 'Reopen Task'}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={Trash2}
                danger
                onClick={async () => {
                  const res = await confirm({
                    title: 'Confirm delete?',
                    description: `Are you sure you want to permanently delete "${issue.title}"? This cannot be undone.`,
                    confirmButtonText: 'Yes, delete',
                    confirButtinText: 'Yes, delete',
                    danger: true,
                  });
                  if (res?.result) {
                    handleDelete(issue);
                  }
                }}
              >
                Delete Task
              </DropdownItem>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [projectMap, pinnedKeys, handleUpdate, handleToggleState, handleDelete, togglePin, onEdit, globalLabels, appSettings, customStatuses, confirm]);

  const table = useReactTable({
    data: filteredIssues, columns,
    state: { rowSelection, sorting },
    enableRowSelection: true,
    manualSorting: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
      sorting: [{ id: 'created_at', desc: true }],
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBulkClose = async () => {
    const items = selectedRows.map((r) => ({ projectId: r.original.project_id, issueIid: r.original.iid, state: r.original.state }));
    await bulkCloseIssues(items);
    setRowSelection({});
    toast({ type: 'success', message: `✓ Closed ${items.filter(i => i.state === 'opened').length} tasks` });
  };
  const handleBulkOpen = async () => {
    const items = selectedRows.filter((r) => r.original.state === 'closed').map((r) => ({ projectId: r.original.project_id, issueIid: r.original.iid }));
    await Promise.all(items.map((i) => toggleTaskState(i.projectId, i.issueIid, 'closed')));
    setRowSelection({});
    toast({ type: 'success', message: `✓ Reopened ${items.length} tasks` });
  };
  const handleBulkAssign = async () => {
    const items = selectedRows.map((r) => ({ projectId: r.original.project_id, issueIid: r.original.iid }));
    await bulkAssignToMe(items);
    setRowSelection({});
    toast({ type: 'success', message: `✓ Assigned ${items.length} tasks to you` });
  };

  const { pageIndex, pageSize } = table.getState().pagination;
  const total = filteredIssues.length;
  const start = pageIndex * pageSize + 1;
  const end   = Math.min((pageIndex + 1) * pageSize, total);

  const SortIcon = ({ col }: { col: any }) => {
    const s = col.getIsSorted();
    if (!s) return <ChevronsUpDown className="h-3 w-3 text-[var(--border)] group-hover:text-[var(--text-3)]" />;
    return s === 'asc' ? <ChevronUp className="h-3 w-3 text-[var(--accent)]" /> : <ChevronDown className="h-3 w-3 text-[var(--accent)]" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Bulk action bar */}
      {hasSelection && (
        <BulkActionBar
          selectedRows={selectedRows}
          onClear={() => setRowSelection({})}
          onCloseSelected={handleBulkClose}
          onOpenSelected={handleBulkOpen}
          onAssignToMe={handleBulkAssign}
        />
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-[850px]">
          <thead className="sticky top-0 z-10 bg-[var(--bg)] theme-transition">
            <tr className="border-b border-[var(--border)]">
              {table.getHeaderGroups()[0].headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.column.columnDef.size }}
                  className={cn(
                    'px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-3)] tracking-wider uppercase',
                    header.column.getCanSort() && 'cursor-pointer select-none group hover:text-[var(--text-2)]'
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && <SortIcon col={header.column} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issuesLoading ? (
              <SkeletonRows count={12} />
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-[var(--border)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-3)]">No tasks found</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isPinned = pinnedKeys.has(`${row.original.project_id}_${row.original.iid}`);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'group border-b border-[var(--border)] hover:bg-[var(--surface)] transition-all duration-200 theme-transition',
                      row.getIsSelected() && 'bg-[var(--accent-muted)]',
                      isPinned && 'border-l-2 border-l-[var(--accent)] bg-[var(--surface-2)]/30 shadow-xs'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn('px-4 align-middle', appSettings?.compactTable ? 'py-1.5' : 'py-3')}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!issuesLoading && total > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] shrink-0 bg-[var(--surface-2)] theme-transition">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs text-[var(--text-3)]">{start}–{end} of {total.toLocaleString()}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-1">
            {[25, 50, 100].map((s) => (
              <button key={s} onClick={() => table.setPageSize(s)}
                className={cn('h-6 px-2 rounded text-xs transition-colors cursor-pointer',
                  table.getState().pagination.pageSize === s
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--surface-3)]'
                )}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

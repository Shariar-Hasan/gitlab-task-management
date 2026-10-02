import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, RefreshCw, Moon, Sun, Settings,
  Kanban, List, FolderGit2, CheckCircle2, Circle, AlertCircle,
  Command, ArrowRight, Sparkles, Filter, ShieldCheck, Tag
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '../lib/utils';
import { getEffectiveStatus } from '../lib/localStore';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  tasks: any[];
  projects: any[];
  projectOverrides: Record<string, any>;
  customStatuses: Record<string, string>;
  boardStatuses: any[];
  onSelectTask: (task: any) => void;
  onCreateTask: () => void;
  onSwitchView: (view: 'table' | 'board') => void;
  onOpenSettings: () => void;
  onOpenStandup: () => void;
  onForceRefresh: () => void;
  onCloudSync: () => void;
  onToggleTheme: () => void;
  onFilterProject: (projectId: string) => void;
  onFilterStatus: (statusId: string) => void;
  theme: string;
}

interface PaletteItem {
  id: string;
  category: 'Actions' | 'Views' | 'Tasks' | 'Projects' | 'Statuses';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: any;
  action: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  tasks,
  projects,
  projectOverrides,
  customStatuses,
  boardStatuses,
  onSelectTask,
  onCreateTask,
  onSwitchView,
  onOpenSettings,
  onOpenStandup,
  onForceRefresh,
  onCloudSync,
  onToggleTheme,
  onFilterProject,
  onFilterStatus,
  theme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open & reset search
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<number | string, any>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Compute all actionable commands & items
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // 1. Core Quick Actions
    const actions: PaletteItem[] = [
      {
        id: 'action-create',
        category: 'Actions',
        title: 'Create New Task',
        subtitle: 'Quickly open task composer (C or N)',
        icon: Plus,
        action: () => { onClose(); onCreateTask(); },
      },
      {
        id: 'action-standup',
        category: 'Actions',
        title: 'Daily Standup & Insights',
        subtitle: 'Generate formatted standup report and view velocity stats',
        icon: Sparkles,
        action: () => { onClose(); onOpenStandup(); },
      },
      {
        id: 'action-cloud-sync',
        category: 'Actions',
        title: 'Sync Cloud Backup Now',
        subtitle: 'Backup settings & data to your private GitLab repo',
        icon: ShieldCheck,
        action: () => { onClose(); onCloudSync(); },
      },
      {
        id: 'action-refresh',
        category: 'Actions',
        title: 'Force Reload from GitLab API',
        subtitle: 'Bypass cache and sync live data',
        icon: RefreshCw,
        action: () => { onClose(); onForceRefresh(); },
      },
      {
        id: 'action-theme',
        category: 'Actions',
        title: `Switch Theme to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle current color palette',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => { onClose(); onToggleTheme(); },
      },
      {
        id: 'action-settings',
        category: 'Actions',
        title: 'Open Settings',
        subtitle: 'Configure GitLab PAT, cloud backup, labels & columns',
        icon: Settings,
        action: () => { onClose(); onOpenSettings(); },
      },
    ];

    // 2. View Switches
    const views: PaletteItem[] = [
      {
        id: 'view-table',
        category: 'Views',
        title: 'Switch to Table View',
        subtitle: 'Detailed sortable & bulk-editable task list',
        icon: List,
        action: () => { onClose(); onSwitchView('table'); },
      },
      {
        id: 'view-board',
        category: 'Views',
        title: 'Switch to Board (Kanban) View',
        subtitle: 'Visual status columns with smooth drag and drop',
        icon: Kanban,
        action: () => { onClose(); onSwitchView('board'); },
      },
    ];

    // Filter actions by query
    actions.forEach((a) => {
      if (!q || a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)) {
        result.push(a);
      }
    });

    views.forEach((v) => {
      if (!q || v.title.toLowerCase().includes(q) || v.subtitle?.toLowerCase().includes(q)) {
        result.push(v);
      }
    });

    // 3. Status Filters (if search mentions status or query matches)
    boardStatuses
      .filter((s) => s.enabled)
      .forEach((status) => {
        if (!q || status.label.toLowerCase().includes(q) || 'status'.includes(q)) {
          result.push({
            id: `status-${status.id}`,
            category: 'Statuses',
            title: `Filter by status: ${status.label}`,
            badge: status.label,
            badgeColor: status.color,
            icon: Circle,
            action: () => { onClose(); onFilterStatus(status.id); },
          });
        }
      });

    // 4. Project Filters (if query matches project name)
    projects
      .filter((p) => {
        const override = projectOverrides[String(p.id)];
        return override?.enabled !== false;
      })
      .slice(0, 15)
      .forEach((proj) => {
        const override = projectOverrides[String(proj.id)];
        const name = override?.customName || proj.name;
        if (!q || name.toLowerCase().includes(q) || proj.path_with_namespace?.toLowerCase().includes(q)) {
          result.push({
            id: `proj-${proj.id}`,
            category: 'Projects',
            title: `Filter project: ${name}`,
            subtitle: proj.path_with_namespace,
            icon: FolderGit2,
            action: () => { onClose(); onFilterProject(String(proj.id)); },
          });
        }
      });

    // 5. Matching Tasks (search across title, iid, project name)
    const matchingTasks = tasks
      .filter((t) => {
        if (!q) return false; // only show tasks if user is actively searching
        const titleMatch = t.title?.toLowerCase().includes(q);
        const iidMatch = String(t.iid).includes(q) || `#${t.iid}`.includes(q);
        const proj = projectMap.get(t.project_id);
        const projMatch = proj && (proj.name?.toLowerCase().includes(q) || proj.path_with_namespace?.toLowerCase().includes(q));
        return titleMatch || iidMatch || projMatch;
      })
      .slice(0, 20);

    matchingTasks.forEach((task) => {
      const proj = projectMap.get(task.project_id);
      const projName = proj ? (projectOverrides[String(proj.id)]?.customName || proj.name) : `Project #${task.project_id}`;
      const statusKey = getEffectiveStatus(task, customStatuses);
      const statusObj = boardStatuses.find((s) => s.id === statusKey);

      result.push({
        id: `task-${task.project_id}-${task.iid}`,
        category: 'Tasks',
        title: task.title,
        subtitle: `${projName} • #${task.iid}${task.due_date ? ` • Due ${task.due_date}` : ''}`,
        badge: statusObj?.label || statusKey,
        badgeColor: statusObj?.color || '#94a3b8',
        action: () => {
          onClose();
          onSelectTask(task);
        },
      });
    });

    return result;
  }, [
    query,
    tasks,
    projects,
    projectOverrides,
    customStatuses,
    boardStatuses,
    projectMap,
    theme,
    onClose,
    onCreateTask,
    onOpenStandup,
    onCloudSync,
    onForceRefresh,
    onToggleTheme,
    onOpenSettings,
    onSwitchView,
    onFilterStatus,
    onFilterProject,
    onSelectTask,
  ]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, items.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = items[selectedIndex];
      if (current) {
        current.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: { category: string; items: PaletteItem[] }[] = [];
    const catOrder = ['Actions', 'Views', 'Tasks', 'Statuses', 'Projects'];

    catOrder.forEach((cat) => {
      const list = items.filter((i) => i.category === cat);
      if (list.length > 0) {
        groups.push({ category: cat, items: list });
      }
    });

    return groups;
  }, [items]);

  // Track global index for flat arrow navigation
  let itemCounter = -1;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[92vw] max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in text-[var(--text-1)] backdrop-blur-xl"
        onKeyDown={handleKeyDown}
      >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>

        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)]/30">
          <Command className="h-5 w-5 text-[var(--accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, task title, #iid, or project name..."
            className="flex-1 bg-transparent text-sm text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-3)] bg-[var(--surface)] border border-[var(--border)] rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Items List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 space-y-3 focus:outline-none"
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-3)] text-sm">
              No matching commands or tasks found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  itemCounter++;
                  const isSelected = itemCounter === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      data-active={isSelected}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(itemCounter)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--accent)] text-white shadow-xs'
                          : 'hover:bg-[var(--surface-2)] text-[var(--text-1)]'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {Icon && (
                          <div
                            className={cn(
                              'h-6 w-6 rounded-lg flex items-center justify-center shrink-0',
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-[var(--surface-3)] text-[var(--text-2)]'
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          {item.subtitle && (
                            <div
                              className={cn(
                                'text-[11px] truncate',
                                isSelected ? 'text-white/80' : 'text-[var(--text-3)]'
                              )}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium border',
                              isSelected
                                ? 'border-white/30 text-white bg-white/10'
                                : 'border-[var(--border)] text-[var(--text-2)] bg-[var(--surface-2)]'
                            )}
                            style={{
                              borderColor: isSelected ? undefined : item.badgeColor,
                              color: isSelected ? undefined : item.badgeColor,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isSelected && <ArrowRight className="h-3.5 w-3.5 text-white/80 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface-2)]/60 border-t border-[var(--border)] text-[10px] text-[var(--text-3)] select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded font-mono">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded font-mono">↵</kbd>
              Select
            </span>
          </div>
          <span>Omnibar Command Center</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

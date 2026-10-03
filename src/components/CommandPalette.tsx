import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, RefreshCw, Moon, Sun, Settings,
  Kanban, List, FolderGit2, Circle, ArrowRight,
  ShieldCheck, FileText, Keyboard, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogOverlay, DialogPortal } from '@radix-ui/react-dialog';
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
  category: 'Commands' | 'Views' | 'Tasks' | 'Filter by Project' | 'Filter by Status';
  title: string;
  subtitle?: string;
  badge?: string;
  shortcut?: string;
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

  // Compute all actionable commands & items with clean monochrome aesthetics
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // 1. Core Quick Commands
    const commands: PaletteItem[] = [
      {
        id: 'cmd-create',
        category: 'Commands',
        title: 'New Task',
        subtitle: 'Open task composer',
        shortcut: 'C',
        icon: Plus,
        action: () => { onClose(); onCreateTask(); },
      },
      {
        id: 'cmd-standup',
        category: 'Commands',
        title: 'Daily Standup & Summary',
        subtitle: 'Generate clean text report & velocity metrics',
        icon: FileText,
        action: () => { onClose(); onOpenStandup(); },
      },
      {
        id: 'cmd-cloud-sync',
        category: 'Commands',
        title: 'Sync Cloud Backup',
        subtitle: 'Backup settings & data to private GitLab repository',
        shortcut: 'S',
        icon: ShieldCheck,
        action: () => { onClose(); onCloudSync(); },
      },
      {
        id: 'cmd-refresh',
        category: 'Commands',
        title: 'Force Reload from GitLab',
        subtitle: 'Bypass cache and sync live issues from API',
        shortcut: 'R',
        icon: RefreshCw,
        action: () => { onClose(); onForceRefresh(); },
      },
      {
        id: 'cmd-theme',
        category: 'Commands',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle theme appearance',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => { onClose(); onToggleTheme(); },
      },
      {
        id: 'cmd-settings',
        category: 'Commands',
        title: 'Settings',
        subtitle: 'Manage token, labels, backup & columns',
        icon: Settings,
        action: () => { onClose(); onOpenSettings(); },
      },
    ];

    // 2. View Switches
    const views: PaletteItem[] = [
      {
        id: 'view-table',
        category: 'Views',
        title: 'Table View',
        subtitle: 'List format with sorting and bulk actions',
        shortcut: '1',
        icon: List,
        action: () => { onClose(); onSwitchView('table'); },
      },
      {
        id: 'view-board',
        category: 'Views',
        title: 'Kanban Board View',
        subtitle: 'Status columns with drag and drop',
        shortcut: '2',
        icon: Kanban,
        action: () => { onClose(); onSwitchView('board'); },
      },
    ];

    // Filter commands by query
    commands.forEach((c) => {
      if (!q || c.title.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q)) {
        result.push(c);
      }
    });

    views.forEach((v) => {
      if (!q || v.title.toLowerCase().includes(q) || v.subtitle?.toLowerCase().includes(q)) {
        result.push(v);
      }
    });

    // 3. Status Filters
    boardStatuses
      .filter((s) => s.enabled)
      .forEach((status) => {
        if (!q || status.label.toLowerCase().includes(q) || 'status'.includes(q)) {
          result.push({
            id: `status-${status.id}`,
            category: 'Filter by Status',
            title: `Filter: ${status.label}`,
            badge: status.label,
            icon: Circle,
            action: () => { onClose(); onFilterStatus(status.id); },
          });
        }
      });

    // 4. Project Filters
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
            category: 'Filter by Project',
            title: name,
            subtitle: proj.path_with_namespace,
            icon: FolderGit2,
            action: () => { onClose(); onFilterProject(String(proj.id)); },
          });
        }
      });

    // 5. Matching Tasks
    const matchingTasks = tasks
      .filter((t) => {
        if (!q) return false;
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
        subtitle: `${projName} · #${task.iid}${task.due_date ? ` · Due ${task.due_date}` : ''}`,
        badge: statusObj?.label || statusKey,
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
    const catOrder = ['Commands', 'Views', 'Tasks', 'Filter by Project', 'Filter by Status'];

    catOrder.forEach((cat) => {
      const list = items.filter((i) => i.category === cat);
      if (list.length > 0) {
        groups.push({ category: cat, items: list });
      }
    });

    return groups;
  }, [items]);

  let itemCounter = -1;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md animate-fade-in" />
        <DialogContent
          aria-describedby={undefined}
          className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[92vw] max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in text-[var(--text-1)]"
          onKeyDown={handleKeyDown}
        >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>

        {/* Input Bar - Clean, subtle, professional */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
          <Search className="h-4 w-4 text-[var(--text-3)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, task title, #iid, or project..."
            className="flex-1 bg-transparent text-xs text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-3)] bg-[var(--surface-2)] border border-[var(--border)] rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Items List - Clean neutral hover, no loud colors */}
        <div
          ref={listRef}
          className="max-h-[340px] overflow-y-auto p-1.5 space-y-2 focus:outline-none"
        >
          {items.length === 0 ? (
            <div className="py-10 text-center text-[var(--text-3)] text-xs">
              No matching commands or tasks found
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.category} className="space-y-0.5">
                <div className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
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
                        'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border)]'
                          : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text-1)] border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {Icon && (
                          <Icon className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]')} />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate leading-tight">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11px] text-[var(--text-3)] truncate leading-tight mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-3)] bg-[var(--surface-2)] border border-[var(--border)]">
                            {item.shortcut}
                          </kbd>
                        )}
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-[var(--text-3)] bg-[var(--surface-2)] border border-[var(--border)]">
                            {item.badge}
                          </span>
                        )}
                        {isSelected && <ArrowRight className="h-3 w-3 text-[var(--text-3)] shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer - Minimalist and subtle */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-2)]/40 border-t border-[var(--border)] text-[10px] text-[var(--text-3)] select-none">
          <div className="flex items-center gap-2">
            <span>↑↓ navigate</span>
            <span>·</span>
            <span>↵ select</span>
            <span>·</span>
            <span>esc close</span>
          </div>
          <span className="font-mono">Command Menu</span>
        </div>
      </DialogContent>
    </DialogPortal>
  </Dialog>
);
}

// ── Class merger ─────────────────────────────────────────────────────────────
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Chrome storage with localStorage fallback ─────────────────────────────────
declare const chrome: any;
const isExtension = typeof chrome !== 'undefined' && chrome?.storage?.sync;

export const storage = {
  get: (keys: string | string[]): Promise<Record<string, any>> => {
    if (isExtension) {
      return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
    }
    const result: Record<string, any> = {};
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach((k) => {
      const val = localStorage.getItem(`gtm_sync_${k}`);
      if (val !== null) {
        try { result[k] = JSON.parse(val); } catch { result[k] = val; }
      }
    });
    return Promise.resolve(result);
  },
  set: (items: Record<string, any>): Promise<void> => {
    if (isExtension) {
      return new Promise((resolve) => chrome.storage.sync.set(items, resolve));
    }
    Object.entries(items).forEach(([k, v]) =>
      localStorage.setItem(`gtm_sync_${k}`, JSON.stringify(v))
    );
    return Promise.resolve();
  },
};

// ── Session cache (5-min TTL by default) ─────────────────────────────────────
const CACHE_VERSION = 'gtm_v1';

export const sessionCache = {
  get<T = any>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(`${CACHE_VERSION}_${key}`);
      if (!raw) return null;
      const { data, ts, ttl } = JSON.parse(raw);
      if (Date.now() - ts > ttl) {
        sessionStorage.removeItem(`${CACHE_VERSION}_${key}`);
        return null;
      }
      return data as T;
    } catch {
      return null;
    }
  },

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    try {
      sessionStorage.setItem(
        `${CACHE_VERSION}_${key}`,
        JSON.stringify({ data, ts: Date.now(), ttl: ttlMs })
      );
    } catch {
      // Storage quota exceeded — clear old entries and try again
      this.pruneExpired();
      try {
        sessionStorage.setItem(
          `${CACHE_VERSION}_${key}`,
          JSON.stringify({ data, ts: Date.now(), ttl: ttlMs })
        );
      } catch { /* give up */ }
    }
  },

  invalidate(key: string): void {
    sessionStorage.removeItem(`${CACHE_VERSION}_${key}`);
  },

  invalidateAll(): void {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_VERSION))
      .forEach((k) => sessionStorage.removeItem(k));
  },

  pruneExpired(): void {
    const now = Date.now();
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_VERSION))
      .forEach((k) => {
        try {
          const item = sessionStorage.getItem(k);
          if (!item) return;
          const { ts, ttl } = JSON.parse(item);
          if (now - ts > ttl) sessionStorage.removeItem(k);
        } catch {
          sessionStorage.removeItem(k);
        }
      });
  },

  /** Returns cache metadata for debugging / display */
  stats(): Array<{ key: string; ageMs: number; ttl: number; fresh: boolean }> {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(CACHE_VERSION));
    const now = Date.now();
    return keys.map((k) => {
      try {
        const item = sessionStorage.getItem(k);
        if (!item) return { key: k, ageMs: Infinity, ttl: 0, fresh: false };
        const { ts, ttl } = JSON.parse(item);
        const ageMs = now - ts;
        return { key: k.replace(`${CACHE_VERSION}_`, ''), ageMs, ttl, fresh: ageMs < ttl };
      } catch {
        return { key: k, ageMs: Infinity, ttl: 0, fresh: false };
      }
    });
  },
};

// ── Date & Time helpers ────────────────────────────────────────────────────────
export interface DateSettings {
  timeFormat?: 'relative' | 'absolute' | string;
  dateFormat?: string;
  clockFormat?: '12h' | '24h' | string;
  [key: string]: any;
}

export interface DueDateInfo {
  status: 'passed' | 'today' | 'upcoming';
  diffDays: number;
  text: string;
  rawDate: string;
  overdue: boolean;
  today: boolean;
  upcoming: boolean;
}

export function getDueDateInfo(dateString: string | null | undefined, settings: DateSettings = {}): DueDateInfo | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  // Parse YYYY-MM-DD cleanly to avoid timezone shifting
  let targetStart: number;
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
    const [y, m, d] = dateString.trim().split('-').map(Number);
    targetStart = new Date(y, m - 1, d).getTime();
  } else {
    targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  }

  const diffDays = Math.round((targetStart - startOfToday) / (1000 * 60 * 60 * 24));
  let status: 'passed' | 'today' | 'upcoming' = 'upcoming'; // default
  if (diffDays < 0) status = 'passed';
  else if (diffDays === 0) status = 'today';
  else status = 'upcoming';

  const { timeFormat = 'relative', dateFormat = 'MMM d, yyyy' } = settings;
  let text = '';
  if (timeFormat === 'relative') {
    if (diffDays < 0) text = `${Math.abs(diffDays)}d overdue`;
    else if (diffDays === 0) text = 'Today';
    else if (diffDays === 1) text = 'Tomorrow';
    else if (diffDays < 7) text = `In ${diffDays}d`;
    else {
      text = formatAbsoluteDate(new Date(targetStart), dateFormat);
    }
  } else {
    text = formatAbsoluteDate(new Date(targetStart), dateFormat);
  }

  return {
    status,
    diffDays,
    text,
    rawDate: dateString,
    overdue: status === 'passed',
    today: status === 'today',
    upcoming: status === 'upcoming',
  };
}

function formatAbsoluteDate(date: Date, dateFormat: string): string {
  if (dateFormat === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  } else if (dateFormat === 'dd/MM/yyyy') {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDueDateBadgeClass(status?: string): string {
  switch (status) {
    case 'passed':
      return 'text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20';
    case 'today':
      return 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20';
    case 'upcoming':
      return 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20';
    default:
      return 'text-[var(--text-3)] hover:text-[var(--text-1)] border-[var(--border)] hover:bg-[var(--surface-2)]';
  }
}

export function formatDate(dateString: number | string | Date | null | undefined, settings: DateSettings = {}) {
  const str = typeof dateString === 'number'
    ? new Date(dateString).toISOString()
    : dateString instanceof Date
      ? dateString.toISOString()
      : dateString;
  const info = getDueDateInfo(str, settings);
  if (!info) return null;
  return {
    text: info.text,
    normal: info.status === 'upcoming',
    overdue: info.status === 'passed',
    warning: info.status === 'today',
    status: info.status,
    diffDays: info.diffDays,
  };
}

export function formatTime(dateInput: number | string | Date | null | undefined, clockFormat: string = '12h'): string {
  if (!dateInput && dateInput !== 0) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: clockFormat === '12h',
  });
}

export function formatDateTime(dateInput: number | string | Date | null | undefined, settings: DateSettings = {}): string {
  if (!dateInput && dateInput !== 0) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const { timeFormat = 'relative', clockFormat = '12h' } = settings;
  
  if (timeFormat === 'relative') {
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  }

  const d = formatDate(date, { ...settings, timeFormat: 'absolute' })?.text || '';
  const t = formatTime(date, clockFormat);
  return `${d} at ${t}`;
}

export interface GlobalLabel {
  id?: string | number;
  name: string;
  color?: string;
  text_color?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Filter issue labels to ONLY those that match configured global labels.
 * Discards any extra GitLab labels not in globalLabels.
 */
export function getVisibleGlobalLabels(
  issueLabels: Array<string | { name?: string; title?: string }> = [],
  globalLabels: GlobalLabel[] = []
): GlobalLabel[] {
  if (!Array.isArray(issueLabels) || issueLabels.length === 0) return [];
  if (!Array.isArray(globalLabels) || globalLabels.length === 0) return [];

  const visible: GlobalLabel[] = [];
  for (const raw of issueLabels) {
    const rawName = (typeof raw === 'string' ? raw : raw?.name || raw?.title || '')?.trim();
    if (!rawName) continue;
    const match = globalLabels.find(
      (gl) => gl.name.toLowerCase() === rawName.toLowerCase()
    );
    if (match && !visible.some((v) => v.name.toLowerCase() === match.name.toLowerCase())) {
      visible.push(match);
    }
  }
  return visible;
}

export function getStatusConfig(state: string) {
  const map: Record<string, { label: string; color: string }> = {
    opened: { label: 'Open',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    closed: { label: 'Closed', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
    merged: { label: 'Merged', color: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  };
  return map[state] || map.opened;
}

export function generateColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Theme helpers ─────────────────────────────────────────────────────────────
export function applyTheme(theme: string): void {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
}

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

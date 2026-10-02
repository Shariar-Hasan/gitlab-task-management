import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Globe, Zap, CheckCircle2, XCircle,
  Eye, EyeOff, ArrowRight, Loader2, LogOut,
  Link, Palette, ListTodo, GitBranch, Tag,
  Clock, Calendar, Trash2, Edit2, RotateCcw,
  Database, Download, Plus, Check, Search, RefreshCw, X,
  Filter, FolderGit2, Moon, Sun, Laptop,
  ToggleRight, FileText,
} from 'lucide-react';
import { Button, Input, Card, Badge, ThemeToggle, Switch } from './ui/index';
import { useToast } from './ui/overlay';
import useStore from '../store/useStore';
import { cn, formatTime, getVisibleGlobalLabels } from '../lib/utils';
import { localStore, TASK_STATUSES } from '../lib/localStore';

// ── Connection Settings ────────────────────────────────────────────────────────
function ConnectionSettings() {
  const { instanceUrl, token, currentUser, isAuthenticated, authError, saveSettings, testConnection, logout } = useStore();
  const toast = useToast();
  const [localUrl, setLocalUrl] = useState(instanceUrl || 'https://gitlab.com');
  const [localToken, setLocalToken] = useState(token || '');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; user?: any; error?: string } | null>(null);

  useEffect(() => { setLocalUrl(instanceUrl || 'https://gitlab.com'); setLocalToken(token || ''); }, [instanceUrl, token]);

  const handleTest = async () => {
    if (!localUrl || !localToken) return;
    setTesting(true); setTestResult(null);
    const r = await testConnection(localUrl.trim(), localToken.trim());
    setTestResult(r); setTesting(false);
  };
  const handleSave = async () => {
    if (!localUrl || !localToken) return;
    setSaving(true);
    const r = await saveSettings(localUrl.trim(), localToken.trim());
    setSaving(false);
    if (r.success) toast({ type: 'success', message: '✓ Settings saved successfully' });
    else toast({ type: 'error', message: `Failed: ${r.error}` });
  };
  const handleLogout = async () => { await logout(); setLocalToken(''); setTestResult(null); toast({ type: 'info', message: 'Logged out' }); };

  const isValidUrl = localUrl.startsWith('http://') || localUrl.startsWith('https://');
  const canSave = isValidUrl && localToken.length > 5;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">GitLab Connection</h3>
        <p className="text-xs text-[var(--text-3)]">Connect to your GitLab instance with a Personal Access Token.</p>
      </div>

      {isAuthenticated && currentUser && (
        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <img src={currentUser.avatar_url} alt={currentUser.name} className="h-10 w-10 rounded-full border border-emerald-500/30" onError={(e: any) => { e.target.style.display = 'none'; }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-1)] truncate">{currentUser.name}</p>
              <p className="text-xs text-[var(--text-2)]">@{currentUser.username}</p>
            </div>
            <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500 text-xs shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </Badge>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} title="Logout"><LogOut className="h-3.5 w-3.5" /></Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--text-2)] mb-2 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> GitLab Instance URL</label>
          <Input id="gitlab-url" type="url" value={localUrl} onChange={(e) => setLocalUrl(e.target.value)} placeholder="https://gitlab.com" className={!isValidUrl && localUrl ? 'border-red-500/50' : ''} />
          <p className="mt-1.5 text-xs text-[var(--text-3)]">Self-hosted: <span className="text-[var(--accent)]">https://gitlab.yourcompany.com</span></p>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-2)] mb-2 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Personal Access Token</label>
          <div className="relative">
            <Input id="gitlab-token" type={showToken ? 'text' : 'password'} value={localToken} onChange={(e) => setLocalToken(e.target.value)} placeholder="glpat-xxxxxxxxxxxxxxxxxxxx" className="pr-10" />
            <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-3)]">Requires scopes: <span className="text-[var(--accent)]">api</span> + <span className="text-[var(--accent)]">read_user</span></p>
        </div>
      </div>

      <Card className="p-4 border-[var(--accent)]/15 bg-[var(--accent-muted)]">
        <h4 className="text-xs font-semibold text-[var(--accent)] mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> How to generate a PAT</h4>
        <ol className="text-xs text-[var(--text-2)] space-y-1.5 list-none">
          {['GitLab profile → Preferences → Access Tokens', 'Click "Add new token"', 'Select api + read_user scopes', 'Copy and paste above'].map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="shrink-0 h-4 w-4 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-[10px] flex items-center justify-center font-bold border border-[var(--accent)]/20">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Card>

      {testResult && (
        <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm animate-fade-in ${testResult.success ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' : 'border-red-500/25 bg-red-500/10 text-red-500'}`}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          <div>
            {testResult.success ? <><p className="font-medium">Connection successful!</p><p className="text-xs opacity-70 mt-0.5">Signed in as {testResult.user?.name}</p></> : <><p className="font-medium">Failed</p><p className="text-xs opacity-70 mt-0.5">{testResult.error}</p></>}
          </div>
        </div>
      )}
      {authError && !testResult && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/25 bg-red-500/10 text-red-500 text-sm">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" /><p>{authError}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
        <Button variant="secondary" onClick={handleTest} disabled={!canSave || testing} className="flex-1">
          {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Zap className="h-4 w-4 mr-1.5" />}
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button onClick={handleSave} disabled={!canSave || saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ArrowRight className="h-4 w-4 mr-1.5" />}
          {saving ? 'Saving...' : 'Save & Connect'}
        </Button>
      </div>
    </div>
  );
}

// ── Appearance & Clock Settings ────────────────────────────────────────────────
function AppearanceSettings() {
  const { theme, setTheme, appSettings, updateAppSettings } = useStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const themes = [
    { value: 'dark', label: 'Dark', desc: 'Dark theme, high contrast', icon: Moon },
    { value: 'light', label: 'Light', desc: 'Light background, crisp text', icon: Sun },
    { value: 'system', label: 'System', desc: 'Follow OS preference', icon: Laptop },
  ];

  const clockFormats = [
    {
      value: '12h',
      label: '12-Hour Clock',
      desc: '12-hour format with AM / PM',
      sample: formatTime(now, '12h'),
    },
    {
      value: '24h',
      label: '24-Hour Clock',
      desc: '24-hour military / international format',
      sample: formatTime(now, '24h'),
    },
  ];

  const timeFormats = [
    { value: 'relative', label: 'Relative Time', example: '2 hours ago, in 3 days, Today' },
    { value: 'absolute', label: 'Absolute Date & Time', example: `Sep 29, 2026 at ${formatTime(now, appSettings.clockFormat || '12h')}` },
  ];

  const dateFormats = [
    { value: 'MMM d, yyyy', label: 'Short Month', example: 'Sep 29, 2026' },
    { value: 'yyyy-MM-dd', label: 'ISO Standard', example: '2026-09-29' },
    { value: 'dd/MM/yyyy', label: 'Day First', example: '29/09/2026' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">Appearance & Time</h3>
        <p className="text-xs text-[var(--text-3)]">Customize dashboard theme, 12h/24h clock, and date formats.</p>
      </div>

      {/* Theme */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2.5">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-center transition-all cursor-pointer group',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105',
                    active
                      ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
                      : 'bg-[var(--surface-3)] text-[var(--text-2)]'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className={cn('text-[10px] mt-0.5', active ? 'text-[var(--accent)]/70' : 'text-[var(--text-3)]')}>{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color Customization */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-[var(--accent)]" /> Accent Color
          </p>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-white/20 shadow-xs"
              style={{ backgroundColor: appSettings.accentColor || '#10b981' }}
            />
            <span className="text-[11px] font-mono text-[var(--text-2)] uppercase">
              {appSettings.accentColor || '#10b981'}
            </span>
            {(appSettings.accentColor && appSettings.accentColor !== '#10b981') && (
              <button
                type="button"
                onClick={() => {
                  updateAppSettings({ accentColor: '#10b981' });
                }}
                className="text-[10px] text-[var(--accent)] hover:underline ml-1 cursor-pointer"
              >
                Reset Default
              </button>
            )}
          </div>
        </div>

        {/* Preset Swatches */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mb-3">
          {[
            { name: 'Emerald', hex: '#10b981' },
            { name: 'Teal', hex: '#14b8a6' },
            { name: 'Cyan', hex: '#06b6d4' },
            { name: 'Sky', hex: '#0ea5e9' },
            { name: 'Blue', hex: '#3b82f6' },
            { name: 'Indigo', hex: '#6366f1' },
            { name: 'Violet', hex: '#8b5cf6' },
            { name: 'Pink', hex: '#ec4899' },
            { name: 'Rose', hex: '#f43f5e' },
            { name: 'Amber', hex: '#f59e0b' },
            { name: 'Orange', hex: '#f97316' },
            { name: 'Lime', hex: '#84cc16' },
          ].map((color) => {
            const isSelected = (appSettings.accentColor || '#10b981').toLowerCase() === color.hex.toLowerCase();
            return (
              <button
                key={color.hex}
                type="button"
                onClick={() => updateAppSettings({ accentColor: color.hex })}
                title={color.name}
                className={cn(
                  'h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group border',
                  isSelected ? 'scale-110 shadow-md ring-2 ring-white/30 border-white' : 'hover:scale-105 border-black/10'
                )}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>

        {/* Custom Color Input */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="color"
              value={appSettings.accentColor || '#10b981'}
              onChange={(e) => updateAppSettings({ accentColor: e.target.value })}
              className="h-8 w-8 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent p-0 overflow-hidden"
            />
            <span className="text-xs font-medium text-[var(--text-1)]">Pick Custom Color</span>
          </label>
          <div className="flex-1 max-w-[130px] ml-auto">
            <Input
              value={appSettings.accentColor || '#10b981'}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                  updateAppSettings({ accentColor: val });
                }
              }}
              placeholder="#10b981"
              className="h-8 text-xs font-mono uppercase"
            />
          </div>
        </div>
      </div>

      {/* 24-Hour vs 12-Hour Clock Setting */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--accent)]" /> Clock Format (12h / 24h)
          </p>
          <span className="text-[11px] font-mono text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-md border border-[var(--accent)]/20">
            Current: {formatTime(now, appSettings.clockFormat || '12h')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {clockFormats.map((c) => {
            const active = (appSettings.clockFormat || '12h') === c.value;
            return (
              <label
                key={c.value}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <input
                  type="radio"
                  name="clockFormat"
                  value={c.value}
                  checked={active}
                  onChange={() => updateAppSettings({ clockFormat: c.value })}
                  className="accent-[var(--accent)] mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-1)]">{c.label}</p>
                    <span className="text-xs font-mono font-bold text-[var(--accent)]">{c.sample}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-3)] mt-1">{c.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Time Display Style */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2.5">Display Mode</p>
        <div className="space-y-2">
          {timeFormats.map((f) => {
            const active = appSettings.timeFormat === f.value;
            return (
              <label
                key={f.value}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <input
                  type="radio"
                  name="timeFormat"
                  value={f.value}
                  checked={active}
                  onChange={() => updateAppSettings({ timeFormat: f.value })}
                  className="accent-[var(--accent)]"
                />
                <div>
                  <p className="text-xs font-medium text-[var(--text-1)]">{f.label}</p>
                  <p className="text-[11px] text-[var(--text-3)]">{f.example}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Date Format */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-[var(--accent)]" /> Date Format
        </p>
        <div className="grid grid-cols-3 gap-2">
          {dateFormats.map((d) => {
            const active = (appSettings.dateFormat || 'MMM d, yyyy') === d.value;
            return (
              <label
                key={d.value}
                className={cn(
                  'flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all text-center',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <input
                  type="radio"
                  name="dateFormat"
                  value={d.value}
                  checked={active}
                  onChange={() => updateAppSettings({ dateFormat: d.value })}
                  className="sr-only"
                />
                <span className="text-xs font-medium text-[var(--text-1)]">{d.label}</span>
                <span className="text-[10px] text-[var(--accent)] mt-0.5">{d.example}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Global Labels Settings ────────────────────────────────────────────────────
function GlobalLabelsSettings() {
  const { globalLabels, addGlobalLabel, updateGlobalLabel, deleteGlobalLabel, resetGlobalLabels, issues } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '#3b82f6', description: '' });
  const [newLabel, setNewLabel] = useState({ name: '', color: '#ef4444', description: '' });
  const [showAdd, setShowAdd] = useState(false);

  const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
    '#14b8a6', '#84cc16'
  ];

  // Count usage of each label in currently cached issues
  const labelUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((i) => {
      const matched = getVisibleGlobalLabels(i.labels, globalLabels);
      matched.forEach((m) => {
        if (m.id) {
          counts[String(m.id)] = (counts[String(m.id)] || 0) + 1;
        }
      });
    });
    return counts;
  }, [issues, globalLabels]);

  const filtered = globalLabels.filter(
    (l) => l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleStartEdit = (label: any) => {
    setEditingId(label.id);
    setEditForm({ name: label.name, color: label.color, description: label.description || '' });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;
    updateGlobalLabel(id, {
      name: editForm.name.trim(),
      color: editForm.color,
      description: editForm.description.trim(),
    });
    setEditingId(null);
    toast({ type: 'success', message: 'Label updated' });
  };

  const handleDelete = (id: string, name: string) => {
    deleteGlobalLabel(id);
    toast({ type: 'info', message: `Deleted label "${name}"` });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.name.trim()) return;
    try {
      addGlobalLabel(newLabel);
      setNewLabel({ name: '', color: '#3b82f6', description: '' });
      setShowAdd(false);
      toast({ type: 'success', message: `Added global label "${newLabel.name.trim()}"` });
    } catch (err: any) {
      toast({ type: 'error', message: err.message });
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all global labels to recommended defaults? Custom labels will be replaced.')) {
      resetGlobalLabels();
      toast({ type: 'info', message: 'Reset to default labels' });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Global Labels</h3>
          <span className="text-xs font-mono text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full border border-[var(--accent)]/20">
            {globalLabels.length} labels
          </span>
        </div>
        <p className="text-xs text-[var(--text-3)]">
          Labels shared across all projects. Only your defined global labels are shown on tasks in the UI.
        </p>
      </div>

      {/* Info card */}
      <Card className="p-3.5 border-[var(--accent)]/20 bg-[var(--accent-muted)]/40 text-xs text-[var(--text-2)] space-y-1">
        <p className="font-semibold text-[var(--accent)] flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" /> How Global Labels Work
        </p>
        <p>• When you assign a global label to a task, if the GitLab project does not have this label yet, it is automatically created on GitLab with your chosen color.</p>
        <p>• Only your defined global labels appear on cards and filters in the dashboard — extra GitLab labels are hidden.</p>
      </Card>

      {/* Search and Add Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search labels..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 shrink-0 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Label
          </Button>
        )}
      </div>

      {/* Add New Label Form */}
      {showAdd && (
        <Card className="p-4 border-[var(--accent)]/30 bg-[var(--surface-2)] animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--text-1)] flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-[var(--accent)]" /> New Global Label
            </p>
            <button
              onClick={() => setShowAdd(false)}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--text-2)] mb-1 block">Name</label>
              <Input
                value={newLabel.name}
                onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                placeholder="e.g. Bug, Feature, Urgent, Polish..."
                className="h-8 text-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-2)] mb-1 block">Description (optional)</label>
              <Input
                value={newLabel.description}
                onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
                placeholder="Brief label note..."
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-2)] mb-1.5 block">Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewLabel({ ...newLabel, color: c })}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 shadow-xs cursor-pointer',
                      newLabel.color === c ? 'border-white scale-110 ring-2 ring-[var(--accent)]' : 'border-transparent'
                    )}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={newLabel.color}
                  onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                  className="h-6 w-6 rounded-full cursor-pointer border-0 p-0 shadow-xs"
                  title="Choose custom color"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="pt-1 flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-3)]">Preview:</span>
              <Badge
                className="text-xs px-2.5 py-0.5 border font-medium"
                style={{
                  background: `${newLabel.color}20`,
                  color: newLabel.color,
                  borderColor: `${newLabel.color}50`,
                }}
              >
                {newLabel.name.trim() || 'Label Preview'}
              </Badge>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="flex-1 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!newLabel.name.trim()} className="flex-1 text-xs">
                Save Label
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Labels List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-[var(--text-3)] text-center py-6">
            {globalLabels.length === 0 ? 'No global labels defined' : 'No matching labels found'}
          </p>
        ) : (
          filtered.map((label) => {
            const isEditing = editingId === label.id;
            const count = labelUsage[label.id] || 0;

            if (isEditing) {
              return (
                <Card key={label.id} className="p-3 border-[var(--accent)]/50 bg-[var(--surface-2)] space-y-2.5">
                  <div className="flex gap-2">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Label name..."
                      className="h-8 text-xs flex-1"
                    />
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="h-8 w-8 rounded-lg cursor-pointer border border-[var(--border)] p-0"
                    />
                  </div>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description..."
                    className="h-7 text-xs"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-7 text-xs px-2.5">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleSaveEdit(label.id)} className="h-7 text-xs px-2.5">
                      <Check className="h-3 w-3" /> Save
                    </Button>
                  </div>
                </Card>
              );
            }

            return (
              <div
                key={label.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ background: label.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        className="text-xs px-2 py-0.5 border font-medium truncate"
                        style={{
                          background: `${label.color}1c`,
                          color: label.color,
                          borderColor: `${label.color}45`,
                        }}
                      >
                        {label.name}
                      </Badge>
                      {count > 0 && (
                        <span className="text-[10px] text-[var(--text-3)] font-mono">
                          {count} {count === 1 ? 'task' : 'tasks'}
                        </span>
                      )}
                    </div>
                    {label.description && (
                      <p className="text-[11px] text-[var(--text-3)] truncate mt-0.5">{label.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleStartEdit(label)}
                    title="Edit label"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-[var(--text-2)]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(label.id, label.name)}
                    title="Delete label"
                    className="hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetDefaults}
          className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] gap-1.5"
        >
          <RotateCcw className="h-3 w-3" /> Reset to defaults
        </Button>
      </div>
    </div>
  );
}

// ── Setting Row Helper ────────────────────────────────────────────────────────
function SettingRow({ icon: Icon, title, desc, right }: { icon: any; title: string; desc: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[var(--border)] last:border-0">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-[var(--text-2)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-1)]">{title}</p>
          <p className="text-xs text-[var(--text-3)] mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

// ── Task Defaults Settings ────────────────────────────────────────────────────
function TaskSettings() {
  const { appSettings, updateAppSettings, currentUser, pinnedKeys, projects, globalLabels } = useStore();
  const toast = useToast();

  const defProjects = appSettings.defaultFilterProjects || [];
  const defStatuses = Array.isArray(appSettings.defaultFilterStatus)
    ? appSettings.defaultFilterStatus
    : (appSettings.defaultFilterStatus && appSettings.defaultFilterStatus !== 'all' ? [appSettings.defaultFilterStatus] : []);
  const defLabels = appSettings.defaultFilterLabels || [];

  const toggleDefStatus = (statusId: string) => {
    const next = defStatuses.includes(statusId)
      ? defStatuses.filter((s) => s !== statusId)
      : [...defStatuses, statusId];
    updateAppSettings({ defaultFilterStatus: next });
    toast({ type: 'success', message: '✓ Default statuses updated' });
  };

  const toggleDefProject = (pid: string | number) => {
    const sPid = String(pid);
    const next = defProjects.includes(sPid)
      ? defProjects.filter((p) => p !== sPid)
      : [...defProjects, sPid];
    updateAppSettings({ defaultFilterProjects: next });
    toast({ type: 'success', message: '✓ Default projects updated' });
  };

  const toggleDefLabel = (name: string) => {
    const next = defLabels.includes(name)
      ? defLabels.filter((l) => l !== name)
      : [...defLabels, name];
    updateAppSettings({ defaultFilterLabels: next });
    toast({ type: 'success', message: '✓ Default labels updated' });
  };

  const retentionOptions = [
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days (Recommended)' },
    { value: 60, label: '60 Days' },
    { value: 90, label: '90 Days' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">Task Defaults & Filters</h3>
        <p className="text-xs text-[var(--text-3)]">Configure default filters on page load, auto-assign rules, and data retention.</p>
      </div>

      {/* Default Filters on Load */}
      <Card className="p-4 space-y-6 border-[var(--accent)]/20">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--accent)]" />
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-1)]">Default Filters (Applied on Page Load)</h4>
            <p className="text-[11px] text-[var(--text-3)]">These filters are automatically active whenever you open the dashboard.</p>
          </div>
        </div>

        {/* Status (Multi-Select) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider">
              Default Statuses ({defStatuses.length === 0 ? 'All' : `${defStatuses.length} selected`})
            </p>
            {defStatuses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  updateAppSettings({ defaultFilterStatus: [] });
                  toast({ type: 'success', message: '✓ Reset to All Status' });
                }}
                className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
              >
                Clear all (Show all)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                updateAppSettings({ defaultFilterStatus: [] });
                toast({ type: 'success', message: '✓ Default status: All' });
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                defStatuses.length === 0
                  ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)] font-semibold'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--border-hover)]'
              )}
            >
              All Status
            </button>
            {TASK_STATUSES.map((s) => {
              const active = defStatuses.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleDefStatus(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)] font-semibold text-[var(--text-1)] shadow-xs'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--border-hover)]'
                  )}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                  {active && <Check className="h-3 w-3 text-[var(--accent)] ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider">
                Default Projects ({defProjects.length === 0 ? 'All' : `${defProjects.length} selected`})
              </p>
              {defProjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateAppSettings({ defaultFilterProjects: [] })}
                  className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Reset to All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-[var(--border)] rounded-xl bg-[var(--surface-2)]/40">
              {projects.map((p) => {
                const sId = String(p.id);
                const active = defProjects.includes(sId);
                const hue = (p.id * 137) % 360;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleDefProject(p.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-all cursor-pointer',
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)] font-semibold shadow-xs'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)]'
                    )}
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-3.5 w-3.5 rounded object-cover" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded text-[8px] font-bold text-white flex items-center justify-center" style={{ background: `hsl(${hue}, 55%, 35%)` }}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate max-w-[120px]">{p.name}</span>
                    {active && <Check className="h-3 w-3 text-[var(--accent)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Labels */}
        {globalLabels.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider">
                Default Labels ({defLabels.length === 0 ? 'All' : `${defLabels.length} selected`})
              </p>
              {defLabels.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateAppSettings({ defaultFilterLabels: [] })}
                  className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Reset to All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 p-1 border border-[var(--border)] rounded-xl bg-[var(--surface-2)]/40">
              {globalLabels.map((l) => {
                const active = defLabels.includes(l.name);
                return (
                  <button
                    key={l.id || l.name}
                    type="button"
                    onClick={() => toggleDefLabel(l.name)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-all cursor-pointer',
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)] font-semibold text-[var(--text-1)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-hover)]'
                    )}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <span>{l.name}</span>
                    {active && <Check className="h-3 w-3 text-[var(--accent)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-1">
        <SettingRow
          icon={Shield}
          title="Auto-assign me on create"
          desc={currentUser ? `New tasks will be assigned to @${currentUser.username}` : 'Sign in first to enable auto-assign'}
          right={
            <Switch
              checked={appSettings.autoAssignOnCreate}
              onCheckedChange={(v) => updateAppSettings({ autoAssignOnCreate: v })}
              disabled={!currentUser}
            />
          }
        />
        <SettingRow
          icon={GitBranch}
          title="Pinned Tasks"
          desc={`${pinnedKeys.size} task(s) currently pinned to the top of the table.`}
          right={
            pinnedKeys.size > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStore.setPinned([]);
                  useStore.setState({ pinnedKeys: new Set() });
                  toast({ type: 'info', message: 'Cleared pinned tasks' });
                }}
                className="text-xs text-red-400 hover:text-red-500"
              >
                Clear all pins
              </Button>
            ) : (
              <span className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] border border-[var(--border)] px-2 py-1 rounded-md">
                None pinned
              </span>
            )
          }
        />
      </Card>

      {/* Closed Issue Retention */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-[var(--accent)]" />
          <h4 className="text-xs font-semibold text-[var(--text-1)]">Closed Issues Auto-Prune</h4>
        </div>
        <p className="text-xs text-[var(--text-3)] mb-3 leading-relaxed">
          To ensure lightning-fast dashboard performance, closed issues older than this retention period are automatically removed on load.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {retentionOptions.map((opt) => {
            const active = (appSettings.retentionDays || 30) === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <input
                  type="radio"
                  name="retentionDays"
                  value={opt.value}
                  checked={active}
                  onChange={() => updateAppSettings({ retentionDays: opt.value })}
                  className="accent-[var(--accent)]"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Storage & Cache Settings ──────────────────────────────────────────────────
function StorageSettings() {
  const { projects, issues, globalLabels, refreshAll } = useStore();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      toast({ type: 'success', message: '✓ Data refreshed from GitLab' });
    } catch (err: any) {
      toast({ type: 'error', message: `Refresh failed: ${err.message}` });
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Wipe cached issues and projects? You will need to re-fetch from GitLab.')) {
      localStore.setIssues([]);
      localStore.setProjects([]);
      localStore.setLastFetchedAt(null);
      useStore.setState({ issues: [], projects: [], lastFetchedAt: null });
      toast({ type: 'info', message: 'Local cache cleared' });
    }
  };

  const handleExportBackup = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      globalLabels: localStore.getGlobalLabels(),
      settings: localStore.getSettings(),
      pinned: Array.from(localStore.getPinned()),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gitlab-tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ type: 'success', message: 'Backup file exported' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">Storage & Cache</h3>
        <p className="text-xs text-[var(--text-3)]">View local cache diagnostics and manage stored data.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-center">
          <p className="text-xl font-bold text-[var(--text-1)]">{projects.length}</p>
          <p className="text-[10px] text-[var(--text-3)] uppercase font-medium mt-0.5">Cached Projects</p>
        </div>
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-center">
          <p className="text-xl font-bold text-[var(--accent)]">{issues.length}</p>
          <p className="text-[10px] text-[var(--text-3)] uppercase font-medium mt-0.5">Cached Issues</p>
        </div>
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-center">
          <p className="text-xl font-bold text-emerald-500">{globalLabels.length}</p>
          <p className="text-[10px] text-[var(--text-3)] uppercase font-medium mt-0.5">Global Labels</p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-1)]">Force Synchronize</p>
            <p className="text-[11px] text-[var(--text-3)]">Fetch fresh data from GitLab REST & GraphQL APIs</p>
          </div>
          <Button
            size="sm"
            onClick={handleForceRefresh}
            disabled={refreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            {refreshing ? 'Syncing...' : 'Force Sync'}
          </Button>
        </div>

        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-1)]">Export Configuration</p>
            <p className="text-[11px] text-[var(--text-3)]">Download global labels and settings as JSON</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportBackup}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
        </div>

        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-400">Clear Cache</p>
            <p className="text-[11px] text-[var(--text-3)]">Wipe local issue store and force fresh sync on next load</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleClearCache}
            className="text-xs"
          >
            Clear Cache
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Project Management Settings ────────────────────────────────────────────────
function ProjectSettings() {
  const { projects, projectOverrides, updateProjectOverride } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.path_with_namespace || '').toLowerCase().includes(q)
    );
  }, [projects, search]);

  const enabledCount = projects.filter((p) => {
    const ov = projectOverrides?.[String(p.id)];
    return ov?.enabled !== false;
  }).length;

  const handleToggle = (p: any) => {
    const ov = projectOverrides?.[String(p.id)];
    const currentlyEnabled = ov?.enabled !== false;
    updateProjectOverride(p.id, { enabled: !currentlyEnabled });
    const name = ov?.customName || p.name;
    toast({ type: 'success', message: `"${name}" ${!currentlyEnabled ? 'enabled' : 'disabled'}` });
  };

  const handleStartEdit = (p: any) => {
    setEditingId(String(p.id));
    const ov = projectOverrides?.[String(p.id)];
    setEditName(ov?.customName || p.name);
  };

  const handleSaveName = (p: any) => {
    const name = editName.trim();
    if (!name) return;
    updateProjectOverride(p.id, { customName: name === p.name ? undefined : name });
    setEditingId(null);
    toast({ type: 'success', message: `Renamed to "${name}"` });
  };

  const handleResetName = (p: any) => {
    updateProjectOverride(p.id, { customName: undefined });
    setEditingId(null);
    toast({ type: 'info', message: 'Reset to original name' });
  };

  const handleEnableAll = () => {
    projects.forEach((pr) => updateProjectOverride(pr.id, { enabled: true }));
    toast({ type: 'success', message: 'All projects enabled' });
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">Project Management</h3>
          <p className="text-xs text-[var(--text-3)]">No projects loaded yet. Connect and sync first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Project Management</h3>
          <span className="text-xs font-mono text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full border border-[var(--accent)]/20">
            {enabledCount}/{projects.length} enabled
          </span>
        </div>
        <p className="text-xs text-[var(--text-3)]">Rename projects for display and toggle which ones appear in the dashboard.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." className="pl-8 h-8 text-xs" />
        </div>
        <Button variant="ghost" size="sm" onClick={handleEnableAll} className="text-xs gap-1.5 shrink-0">
          <ToggleRight className="h-3.5 w-3.5 text-[var(--accent)]" /> Enable All
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => {
          const ov = projectOverrides?.[String(p.id)];
          const isEnabled = ov?.enabled !== false;
          const displayName = ov?.customName || p.name;
          const hasCustomName = ov?.customName && ov.customName !== p.name;
          const isEditing = editingId === String(p.id);
          const hue = (p.id * 137) % 360;
          return (
            <div key={p.id} className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all group', isEnabled ? 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)]' : 'border-[var(--border)]/50 bg-[var(--surface-2)]/50 opacity-60')}>
              <div className="shrink-0">
                {p.avatar_url ? (<img src={p.avatar_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-[var(--border)]" />) : (
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white border border-[var(--border)]" style={{ background: `hsl(${hue}, 55%, 35%)` }}>{p.name.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(p); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 h-7 px-2 text-xs rounded-md border border-[var(--accent)]/60 bg-[var(--surface)] text-[var(--text-1)] focus:outline-none"
                    />
                    <button type="button" onClick={() => handleSaveName(p)} className="h-7 w-7 flex items-center justify-center rounded-md bg-[var(--accent)] text-white hover:opacity-90 cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="h-7 w-7 flex items-center justify-center rounded-md text-[var(--text-3)] hover:bg-[var(--surface-3)] cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                    {hasCustomName && <button type="button" onClick={() => handleResetName(p)} className="h-7 w-7 flex items-center justify-center rounded-md text-[var(--text-3)] hover:text-red-500 cursor-pointer"><RotateCcw className="h-3 w-3" /></button>}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[var(--text-1)] truncate">{displayName}</p>
                      {hasCustomName && <span className="text-[9px] text-[var(--accent)] bg-[var(--accent-muted)] px-1 py-0.5 rounded font-medium border border-[var(--accent)]/20">renamed</span>}
                    </div>
                    <p className="text-[10px] text-[var(--text-3)] truncate">{p.path_with_namespace}</p>
                  </div>
                )}
              </div>
              {!isEditing && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => handleStartEdit(p)} title="Rename" className="h-7 w-7 flex items-center justify-center rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <Switch checked={isEnabled} onCheckedChange={() => handleToggle(p)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Description Templates Settings ────────────────────────────────────────────
function TemplatesSettings() {
  const { templates, updateTemplates, resetTemplates } = useStore();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', content: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  const safeTemplates = Array.isArray(templates) ? templates : [];

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;
    updateTemplates(safeTemplates.map((t) => t.id === id ? { ...t, ...editForm } : t));
    setEditingId(null);
    toast({ type: 'success', message: 'Template saved' });
  };

  const handleCreate = () => {
    if (!newTemplate.name.trim()) return;
    const tpl = { id: `tpl-${Date.now()}`, name: newTemplate.name.trim(), content: newTemplate.content };
    updateTemplates([...safeTemplates, tpl]);
    setNewTemplate({ name: '', content: '' });
    setShowAdd(false);
    toast({ type: 'success', message: `Added template "${tpl.name}"` });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Description Templates</h3>
          <span className="text-xs font-mono text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full border border-[var(--accent)]/20">{safeTemplates.length} templates</span>
        </div>
        <p className="text-xs text-[var(--text-3)]">Quick-start content for task descriptions. Available in the task creation modal.</p>
      </div>
      {!showAdd && <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> New Template</Button>}
      {showAdd && (
        <Card className="p-4 border-[var(--accent)]/30 bg-[var(--surface-2)] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--text-1)]">New Template</p>
            <button onClick={() => setShowAdd(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Template name..." className="h-8 text-xs" autoFocus />
          <textarea value={newTemplate.content} onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })} placeholder="Markdown content..." rows={5} className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:border-[var(--accent)]/60 placeholder:text-[var(--text-3)] text-[var(--text-1)]" />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="flex-1 text-xs">Cancel</Button>
            <Button size="sm" disabled={!newTemplate.name.trim()} onClick={handleCreate} className="flex-1 text-xs">Save</Button>
          </div>
        </Card>
      )}
      <div className="space-y-2">
        {safeTemplates.map((tpl) => {
          const isEditing = editingId === tpl.id;
          return (
            <div key={tpl.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden group">
              {isEditing ? (
                <div className="p-3 space-y-2">
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-xs" autoFocus />
                  <textarea value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} rows={5} className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono resize-none focus:outline-none text-[var(--text-1)]" />
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-7 text-xs">Cancel</Button>
                    <Button size="sm" onClick={() => handleSaveEdit(tpl.id)} className="h-7 text-xs"><Check className="h-3 w-3" /> Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3">
                  <FileText className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-1)]">{tpl.name}</p>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5 line-clamp-2 font-mono">{(tpl.content || '').slice(0, 100)}...</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditingId(tpl.id); setEditForm({ name: tpl.name, content: tpl.content }); }}><Edit2 className="h-3.5 w-3.5 text-[var(--text-2)]" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => { updateTemplates(safeTemplates.filter((t) => t.id !== tpl.id)); toast({ type: 'info', message: `Deleted "${tpl.name}"` }); }} className="hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="pt-2 border-t border-[var(--border)]">
        <Button variant="ghost" size="sm" onClick={() => { resetTemplates(); toast({ type: 'info', message: 'Reset to defaults' }); }} className="text-xs text-[var(--text-3)] gap-1.5">
          <RotateCcw className="h-3 w-3" /> Reset to defaults
        </Button>
      </div>
    </div>
  );
}

// ── Main Settings Component ────────────────────────────────────────────────────
interface SectionItem {
  id: string;
  label: string;
  icon: any;
  component: React.ComponentType;
}

const SECTIONS: SectionItem[] = [
  { id: 'connection', label: 'Connection',       icon: Link,       component: ConnectionSettings },
  { id: 'appearance', label: 'Appearance & Clock', icon: Palette,  component: AppearanceSettings },
  { id: 'projects',   label: 'Projects',         icon: FolderGit2, component: ProjectSettings },
  { id: 'labels',     label: 'Global Labels',    icon: Tag,        component: GlobalLabelsSettings },
  { id: 'templates',  label: 'Templates',        icon: FileText,   component: TemplatesSettings },
  { id: 'tasks',      label: 'Task Defaults',    icon: ListTodo,   component: TaskSettings },
  { id: 'storage',    label: 'Storage & Cache',  icon: Database,   component: StorageSettings },
];

export interface SettingsProps {
  onBack?: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [activeSection, setActiveSection] = useState('connection');
  const ActiveComponent = SECTIONS.find((s) => s.id === activeSection)?.component || ConnectionSettings;

  return (
    <div className="flex h-full bg-[var(--bg)] theme-transition">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-1)]">Settings</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {SECTIONS.map((s) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left cursor-pointer',
                  active
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-medium shadow-xs'
                    : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]'
                )}
              >
                <s.icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[var(--border)] space-y-1">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-[var(--text-3)]">Theme</span>
            <ThemeToggle />
          </div>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="w-full justify-start gap-2 text-xs">
              ← Back to Dashboard
            </Button>
          )}
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Globe, Zap, CheckCircle2, XCircle,
  Eye, EyeOff, ArrowRight, Loader2, LogOut,
  Link, Palette, ListTodo, GitBranch, Tag,
  Clock, Calendar, Trash2, Edit2, RotateCcw,
  Database, Download, Plus, Check, Search, RefreshCw, X,
  Filter, FolderGit2, Moon, Sun, Laptop,
  ToggleRight, FileText, Sparkles, LayoutGrid,
} from 'lucide-react';
import { Button, Input, Card, Badge, ThemeToggle, Switch } from './ui/index';
import { useToast, Modal } from './ui/overlay';
import CloudBackupModal from './CloudBackupModal';
import useStore from '../store/useStore';
import { cn, formatTime, getVisibleGlobalLabels } from '../lib/utils';
import { localStore, TASK_STATUSES } from '../lib/localStore';
import HtmlEditor from './ui/HtmlEditor';

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
              <button
                key={c.value}
                type="button"
                onClick={() => updateAppSettings({ clockFormat: c.value })}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] shadow-xs ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    active ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-hover)] bg-[var(--surface-3)]'
                  )}
                >
                  {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-1)]">{c.label}</p>
                    <span className="text-xs font-mono font-bold text-[var(--accent)]">{c.sample}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-3)] mt-1">{c.desc}</p>
                </div>
              </button>
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
              <button
                key={f.value}
                type="button"
                onClick={() => updateAppSettings({ timeFormat: f.value })}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                    active ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-hover)] bg-[var(--surface-3)]'
                  )}
                >
                  {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-1)]">{f.label}</p>
                  <p className="text-[11px] text-[var(--text-3)]">{f.example}</p>
                </div>
              </button>
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
              <button
                key={d.value}
                type="button"
                onClick={() => updateAppSettings({ dateFormat: d.value })}
                className={cn(
                  'flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all text-center',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <span className="text-xs font-medium text-[var(--text-1)]">{d.label}</span>
                <span className="text-[10px] text-[var(--accent)] mt-0.5">{d.example}</span>
              </button>
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

// ── Board View Statuses Settings ──────────────────────────────────────────────
function BoardStatusesSettings() {
  const { boardStatuses, updateBoardStatus, addBoardStatus, deleteBoardStatus, resetBoardStatuses } = useStore();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newStatus, setNewStatus] = useState({ label: '', color: '#06b6d4' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const PRESET_STATUS_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#64748b'];

  const handleToggle = (id: string, currentEnabled: boolean) => {
    const enabledCount = boardStatuses.filter((s) => s.enabled).length;
    if (currentEnabled && enabledCount <= 1) {
      toast({ type: 'warning', message: 'At least one status column must remain enabled' });
      return;
    }
    updateBoardStatus(id, { enabled: !currentEnabled });
    toast({ type: 'success', message: `✓ Status ${!currentEnabled ? 'enabled' : 'disabled'}` });
  };

  const handleColorChange = (id: string, color: string) => {
    updateBoardStatus(id, { color });
  };

  const handleStartEdit = (s: any) => {
    if (s.isSystem || s.id === 'open' || s.id === 'close') return;
    setEditingId(s.id);
    setEditLabel(s.label);
  };

  const handleSaveEdit = (id: string) => {
    if (!editLabel.trim()) return;
    updateBoardStatus(id, { label: editLabel.trim() });
    setEditingId(null);
    toast({ type: 'success', message: '✓ Status renamed' });
  };

  const handleDelete = (id: string, isSystem?: boolean) => {
    if (isSystem || id === 'open' || id === 'close') {
      toast({ type: 'error', message: "System statuses 'Open' and 'Closed' cannot be deleted" });
      return;
    }
    if (window.confirm('Delete this custom status? Tasks with this status will revert to Open.')) {
      deleteBoardStatus(id);
      toast({ type: 'info', message: 'Status deleted' });
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStatus.label.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (lower === 'open' || lower === 'close' || lower === 'closed') {
      toast({ type: 'error', message: "Cannot create 'Open' or 'Closed' as custom status" });
      return;
    }
    addBoardStatus(trimmed, newStatus.color);
    setNewStatus({ label: '', color: '#06b6d4' });
    setShowAdd(false);
    toast({ type: 'success', message: `✓ Added status: ${trimmed}` });
  };

  const handleReset = () => {
    if (window.confirm('Reset board statuses to defaults? Custom statuses will be removed.')) {
      resetBoardStatuses();
      toast({ type: 'info', message: 'Board statuses restored to defaults' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">Board View Statuses</h3>
          <p className="text-xs text-[var(--text-3)]">
            Configure column visibility and colors for Board View. 'Open' and 'Closed' are GitLab system statuses that can be toggled on/off and recolored, but cannot be created or deleted.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)]">
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Status
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <Card className="p-4 border-[var(--accent)]/30 bg-[var(--surface-2)] animate-slide-up space-y-3">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[var(--text-1)]">Create New Board Status</h4>
              <button type="button" onClick={() => setShowAdd(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-2)] mb-1 block">Status Name</label>
              <Input
                value={newStatus.label}
                onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                placeholder="e.g. Review, QA, Blocked, Needs Info..."
                className="h-8 text-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-2)] mb-1.5 block">Status Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_STATUS_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewStatus({ ...newStatus, color: c })}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 shadow-xs cursor-pointer',
                      newStatus.color === c ? 'border-white scale-110 ring-2 ring-[var(--accent)]' : 'border-transparent'
                    )}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={newStatus.color}
                  onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                  className="h-6 w-6 rounded-full cursor-pointer border-0 p-0 shadow-xs"
                  title="Choose custom color"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="flex-1 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!newStatus.label.trim()} className="flex-1 text-xs">
                Create Status
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Statuses List */}
      <div className="space-y-2">
        {boardStatuses.map((s) => {
          const isSystem = Boolean(s.isSystem || s.id === 'open' || s.id === 'close');
          const isEditing = editingId === s.id;

          return (
            <Card
              key={s.id}
              className={cn(
                'p-3 flex items-center justify-between gap-3 border transition-all',
                s.enabled ? 'border-[var(--border)] bg-[var(--surface)]' : 'border-[var(--border)]/50 bg-[var(--surface-2)]/40 opacity-60'
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Color input circle */}
                <div className="relative shrink-0">
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => handleColorChange(s.id, e.target.value)}
                    className="h-7 w-7 rounded-full cursor-pointer border-0 p-0 opacity-0 absolute inset-0 z-10"
                    title={`Change color for ${s.label}`}
                  />
                  <div
                    className="h-7 w-7 rounded-full border-2 border-white/20 shadow-xs flex items-center justify-center pointer-events-none transition-transform hover:scale-105"
                    style={{ backgroundColor: s.color }}
                  >
                    <span className="h-2 w-2 rounded-full bg-white/60" />
                  </div>
                </div>

                {/* Name / edit */}
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(s.id)}
                      />
                      <Button size="icon-sm" onClick={() => handleSaveEdit(s.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-1)] truncate">{s.label}</span>
                      {isSystem ? (
                        <Badge className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-500 border-blue-500/20">
                          GitLab System
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors p-0.5 cursor-pointer"
                          title="Rename status"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-[var(--text-3)] font-mono mt-0.5">
                    ID: {s.id} {isSystem ? '• GitLab Status (cannot be deleted)' : '• Custom board status'}
                  </p>
                </div>
              </div>

              {/* Right controls: Enable/Disable switch & Delete button */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[var(--text-3)] font-medium">
                    {s.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={() => handleToggle(s.id, s.enabled)}
                  />
                </div>

                {isSystem ? (
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[var(--text-3)]/30 cursor-not-allowed"
                    title="GitLab system statuses ('Open' and 'Closed') cannot be deleted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(s.id, s.isSystem)}
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                    title="Delete status"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Task Defaults Settings ────────────────────────────────────────────────────
function TaskSettings() {
  const { appSettings, updateAppSettings, currentUser, pinnedKeys, projects, globalLabels, boardStatuses } = useStore();
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
            {((boardStatuses || TASK_STATUSES).filter((s) => s.enabled)).map((s) => {
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

      {/* Undo Grace Period on Major Changes */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="h-4 w-4 text-[var(--accent)]" />
          <h4 className="text-xs font-semibold text-[var(--text-1)]">Undo Period on Major Changes</h4>
        </div>
        <p className="text-xs text-[var(--text-3)] mb-3 leading-relaxed">
          When changing task status, deleting a task, toggling open/close, or reordering sequence, a Sonner toast with an Undo action is displayed for this duration before changes become permanent.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { value: 0, label: 'Instant', desc: 'No undo' },
            { value: 3, label: '3 Seconds', desc: 'Quick' },
            { value: 5, label: '5 Seconds', desc: 'Default' },
            { value: 8, label: '8 Seconds', desc: 'Relaxed' },
            { value: 10, label: '10 Seconds', desc: 'Generous' },
          ].map((opt) => {
            const currentVal = appSettings.undoPeriod !== undefined ? appSettings.undoPeriod : 5;
            const active = currentVal === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  updateAppSettings({ undoPeriod: opt.value });
                  toast.success(opt.value === 0 ? 'Undo disabled' : `Undo period set to ${opt.value}s`);
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs cursor-pointer transition-all text-center',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] font-medium text-[var(--accent)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--border-hover)]'
                )}
              >
                <span className="font-semibold text-xs">{opt.label}</span>
                <span className="text-[10px] text-[var(--text-3)] mt-0.5">{opt.desc}</span>
              </button>
            );
          })}
        </div>
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

      {/* Board View Status Columns */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[var(--accent)]" />
            <h4 className="text-xs font-semibold text-[var(--text-1)]">Board View Columns</h4>
          </div>
          <button
            type="button"
            onClick={() => {
              updateAppSettings({ boardColumns: TASK_STATUSES.map((s) => s.id) });
              toast({ type: 'info', message: 'All board columns selected' });
            }}
            className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
          >
            Select All
          </button>
        </div>
        <p className="text-xs text-[var(--text-3)] mb-3 leading-relaxed">
          Select which status columns are visible in the Board View. Tasks can be dragged and dropped between these columns to instantly update their status.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {((boardStatuses || TASK_STATUSES).filter((s) => s.enabled)).map((s) => {
            const activeCols = appSettings.boardColumns || (boardStatuses || TASK_STATUSES).filter((st) => st.enabled).map((st) => st.id);
            const isChecked = activeCols.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  let next: string[];
                  if (isChecked) {
                    if (activeCols.length <= 1) {
                      toast({ type: 'warning', message: 'At least one column must be enabled' });
                      return;
                    }
                    next = activeCols.filter((id) => id !== s.id);
                  } else {
                    next = [...activeCols, s.id];
                  }
                  updateAppSettings({ boardColumns: next });
                }}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all',
                  isChecked
                    ? 'border-[var(--accent)] bg-[var(--accent-muted)] font-medium text-[var(--text-1)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-3)] hover:border-[var(--border-hover)]'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                </div>
                {isChecked && <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />}
              </button>
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
          <div>
            <p className="text-[11px] font-medium text-[var(--text-3)] mb-1">Template Content (HTML Editor)</p>
            <HtmlEditor
              value={newTemplate.content}
              onChange={(content) => setNewTemplate({ ...newTemplate, content })}
              placeholder="Compose rich template content with headings, lists, tables, checklists..."
              minHeight="150px"
            />
          </div>
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
                  <div>
                    <p className="text-[11px] font-medium text-[var(--text-3)] mb-1">Template Content (HTML Editor)</p>
                    <HtmlEditor
                      value={editForm.content}
                      onChange={(content) => setEditForm({ ...editForm, content })}
                      placeholder="Edit rich template content..."
                      minHeight="150px"
                    />
                  </div>
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
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5 line-clamp-2">
                      {(tpl.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}...
                    </p>
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

// ── Version & Updates Settings ───────────────────────────────────────────────
function UpdatesSettings() {
  const { appSettings, updateAppSettings, latestVersion, updateAvailable, checkForUpdate } = useStore();
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  const manifestVersion = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || '1.1.0';
  const repo = appSettings.githubRepo || 'Shariar-Hasan/gitlab-task-management';
  const checkHours = appSettings.updateCheckHours || 4;
  const lastCheckTs = localStore.getLastUpdateCheck();
  const lastCheckStr = lastCheckTs ? new Date(lastCheckTs).toLocaleString() : 'Never';

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await checkForUpdate({ force: true });
      const storeState = useStore.getState();
      if (storeState.updateAvailable) {
        toast({ type: 'warning', message: `Update available: v${storeState.latestVersion}` });
      } else {
        toast({ type: 'success', message: 'You are running the latest version!' });
      }
    } catch (e: any) {
      toast({ type: 'error', message: `Check failed: ${e.message}` });
    } finally {
      setChecking(false);
    }
  };

  const intervalOptions = [
    { value: 1, label: 'Every 1 hour' },
    { value: 2, label: 'Every 2 hours' },
    { value: 4, label: 'Every 4 hours (Default)' },
    { value: 8, label: 'Every 8 hours' },
    { value: 12, label: 'Every 12 hours' },
    { value: 24, label: 'Every 24 hours (Daily)' },
  ];

  const handleIntervalChange = (hours: number) => {
    updateAppSettings({ updateCheckHours: hours });
    if (typeof chrome !== 'undefined' && chrome?.alarms) {
      try {
        chrome.alarms.create('check-version-update', { periodInMinutes: hours * 60 });
      } catch {}
    }
    toast({ type: 'success', message: `Update check set to every ${hours}h` });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">Version & Updates</h3>
        <p className="text-xs text-[var(--text-3)]">
          Manage automatic background update checks and view latest release information.
        </p>
      </div>

      {/* Version Status Card */}
      <Card className={cn(
        'p-4 border transition-all',
        updateAvailable
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-emerald-500/20 bg-emerald-500/5'
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border',
              updateAvailable
                ? 'border-amber-500/30 bg-amber-500/20 text-amber-500'
                : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-500'
            )}>
              {updateAvailable ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-[var(--text-1)]">
                  {updateAvailable ? 'New Update Available!' : 'Up to Date'}
                </h4>
                <Badge className={updateAvailable ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px]' : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px]'}>
                  v{manifestVersion}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                {updateAvailable
                  ? `Version v${latestVersion} is available on GitHub.`
                  : `You are on the latest version (v${manifestVersion}).`}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCheckNow}
            disabled={checking}
            className="shrink-0 gap-1.5"
          >
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {checking ? 'Checking...' : 'Check Now'}
          </Button>
        </div>

        {updateAvailable && (
          <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between gap-3">
            <span className="text-xs text-amber-500 font-medium">
              Download and unpack the latest release to update
            </span>
            <a
              href={`https://github.com/${repo}/releases/latest`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Download v{latestVersion}
            </a>
          </div>
        )}
      </Card>

      {/* Update Check Interval */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--accent)]" />
          <h4 className="text-xs font-semibold text-[var(--text-1)]">Background Check Schedule</h4>
        </div>
        <p className="text-xs text-[var(--text-3)] leading-relaxed">
          The extension background service worker periodically checks GitHub releases against your current version.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {intervalOptions.map((opt) => {
            const active = checkHours === opt.value;
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
                  name="updateCheckHours"
                  value={opt.value}
                  checked={active}
                  onChange={() => handleIntervalChange(opt.value)}
                  className="accent-[var(--accent)]"
                />
                {opt.label}
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-3)]">
          <span>Last checked: <span className="font-mono text-[var(--text-2)]">{lastCheckStr}</span></span>
          <span className="font-mono text-[11px]">Latest remote: v{latestVersion || manifestVersion}</span>
        </div>
      </Card>

      {/* GitHub Repository */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-[var(--accent)]" />
          <h4 className="text-xs font-semibold text-[var(--text-1)]">Update Source Repository</h4>
        </div>
        <p className="text-xs text-[var(--text-3)] leading-relaxed">
          Releases are fetched from the official GitHub repository releases API.
        </p>
        <div className="flex gap-2">
          <Input
            value={repo}
            onChange={(e) => updateAppSettings({ githubRepo: e.target.value })}
            placeholder="owner/repo"
            className="text-xs font-mono"
          />
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors shrink-0"
          >
            <span>View Repo</span>
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </Card>
    </div>
  );
}

// ── Cloud Backup & Sync Settings ──────────────────────────────────────────────
function CloudSyncSettings() {
  const {
    instanceUrl, token, currentUser, isAuthenticated,
    appSettings, updateAppSettings,
    cloudSyncStatus, cloudSyncError, cloudSyncLastSynced,
    syncToCloud, restoreFromCloud
  } = useStore();
  const toast = useToast();
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [editingRepoName, setEditingRepoName] = useState(false);
  const [customRepoInput, setCustomRepoInput] = useState('');

  const enabled = appSettings?.cloudSyncEnabled === true;
  const frequency = appSettings?.cloudSyncFrequency || 'on_change';
  const defaultProjectName = currentUser?.id
    ? `gitlab-task-automation-backup-by-${currentUser.id}`
    : 'gitlab-task-automation-backup-by-<userId>';
  const repoName = appSettings?.cloudSyncRepoName || defaultProjectName;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setEnableModalOpen(true);
    } else {
      updateAppSettings({ cloudSyncEnabled: false });
      toast.info('Cloud backup disabled');
    }
  };

  const handleConfirmEnable = async (chosenRepoName: string) => {
    updateAppSettings({
      cloudSyncEnabled: true,
      cloudSyncRepoName: chosenRepoName,
    });
    setEnableModalOpen(false);
    toast.success('Cloud backup enabled');
    await syncToCloud({ customRepoName: chosenRepoName });
  };

  const handleFrequencyChange = (freq: 'on_change' | '1h' | '1d') => {
    updateAppSettings({ cloudSyncFrequency: freq });
    toast.success(`Sync frequency: ${freq === 'on_change' ? 'Sync on change' : freq === '1h' ? 'Every 1 hour' : 'Every day'}`);
  };

  const handleSyncNow = async () => {
    await syncToCloud();
  };

  const handleRestore = async () => {
    setConfirmRestoreOpen(false);
    await restoreFromCloud();
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Never synced';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-1)] mb-0.5">GitLab Cloud Backup & Sync</h3>
        <p className="text-xs text-[var(--text-3)] leading-relaxed">
          Store your preferences, custom statuses, board layouts, templates, and manual task order in a private GitLab repository.
        </p>
      </div>

      {/* Enable / Disable Card */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-1)]">Automatic Cloud Backup</span>
              <Badge className={cn('text-[10px]', enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-3)]')}>
                {enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-3)] leading-relaxed">
              Periodically commits <code className="px-1 py-0.5 rounded bg-[var(--surface-3)] font-mono text-[11px] text-[var(--accent)]">settings.json</code> to your private GitLab repository.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Repository Details & Name Customization */}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 space-y-2.5">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="text-[var(--text-3)] shrink-0">Backup Repository</span>
            {editingRepoName ? (
              <div className="flex items-center gap-1.5 flex-1 justify-end max-w-sm">
                <input
                  type="text"
                  value={customRepoInput}
                  onChange={(e) => setCustomRepoInput(e.target.value)}
                  placeholder={defaultProjectName}
                  className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--surface)] border border-[var(--border)] text-[var(--text-1)] w-full focus:outline-none focus:border-[var(--accent)]"
                />
                <Button
                  size="sm"
                  className="h-6 px-2 text-[11px] shrink-0"
                  onClick={() => {
                    const trimmed = customRepoInput.trim();
                    if (!trimmed) return;
                    updateAppSettings({ cloudSyncRepoName: trimmed });
                    setEditingRepoName(false);
                    toast.success('Backup repository name updated');
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px] shrink-0"
                  onClick={() => setEditingRepoName(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono font-medium text-[var(--accent)] text-[11px] bg-[var(--accent-muted)]/40 px-2 py-0.5 rounded border border-[var(--accent)]/30 truncate max-w-xs">
                  {repoName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomRepoInput(appSettings?.cloudSyncRepoName || defaultProjectName);
                    setEditingRepoName(true);
                  }}
                  className="text-[11px] text-[var(--text-3)] hover:text-[var(--text-1)] underline cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-3)]">File Path</span>
            <span className="font-mono text-[var(--text-2)] text-[11px]">settings.json (default branch)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-3)]">Dashboard Visibility</span>
            <span className="text-emerald-500 font-medium text-[11px] flex items-center gap-1">
              <Check className="h-3 w-3" /> Excluded from project list & dashboard
            </span>
          </div>
        </div>
      </Card>

      {/* Sync Frequency Options */}
      {enabled && (
        <Card className="p-4 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-1)] mb-0.5">Sync Frequency</h4>
            <p className="text-xs text-[var(--text-3)]">Choose when your settings should be backed up to GitLab.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'on_change', label: 'Sync on Change', desc: 'Auto-sync after edits' },
              { id: '1h', label: 'Every 1 Hour', desc: 'Hourly scheduled backup' },
              { id: '1d', label: 'Every Day', desc: 'Daily scheduled backup' },
            ].map((opt) => {
              const active = frequency === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleFrequencyChange(opt.id as any)}
                  className={cn(
                    'flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]/20 shadow-xs'
                      : 'border-[var(--border)] bg-[var(--surface-2)]/30 hover:border-[var(--border-hover)]'
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={cn('text-xs font-semibold', active ? 'text-[var(--accent)]' : 'text-[var(--text-1)]')}>
                      {opt.label}
                    </span>
                    {active && <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />}
                  </div>
                  <span className="text-[11px] text-[var(--text-3)] leading-tight">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Status & Actions Card */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-[var(--text-1)]">Sync Status</span>
            <div className="flex items-center gap-2 mt-1">
              {cloudSyncStatus === 'syncing' ? (
                <div className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing with GitLab...</span>
                </div>
              ) : cloudSyncStatus === 'error' ? (
                <div className="flex items-center gap-1.5 text-xs text-red-500">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>{cloudSyncError || 'Failed to sync'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
                  <span className={cn('h-2 w-2 rounded-full', cloudSyncLastSynced ? 'bg-emerald-500' : 'bg-slate-400')} />
                  <span>Last synced: {formatLastSync(cloudSyncLastSynced)}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncNow}
            disabled={!isAuthenticated || cloudSyncStatus === 'syncing'}
            className="gap-1.5 cursor-pointer"
          >
            {cloudSyncStatus === 'syncing' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>Sync Now</span>
          </Button>
        </div>

        {/* Restore Section */}
        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-2)]">Restore from Cloud Backup</p>
            <p className="text-[11px] text-[var(--text-3)]">Fetch settings.json from your backup repository and overwrite local configuration</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmRestoreOpen(true)}
            disabled={!isAuthenticated || cloudSyncStatus === 'syncing'}
            className="text-xs cursor-pointer"
          >
            Restore Backup
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal for Restore */}
      <Modal open={confirmRestoreOpen} onClose={() => setConfirmRestoreOpen(false)} size="sm">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-1)]">Restore from Cloud?</h4>
              <p className="text-xs text-[var(--text-3)]">This will overwrite local settings with data from GitLab.</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-2)] leading-relaxed">
            Your custom statuses, templates, global labels, and view configurations will be restored from <code className="font-mono text-[var(--accent)] font-semibold">{repoName}</code>.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmRestoreOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRestore}>
              Confirm & Restore
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation & Explanation Modal when enabling Cloud Backup */}
      <CloudBackupModal
        open={enableModalOpen}
        onClose={() => setEnableModalOpen(false)}
        onConfirm={handleConfirmEnable}
        defaultRepoName={defaultProjectName}
        currentRepoName={appSettings?.cloudSyncRepoName || defaultProjectName}
        loading={cloudSyncStatus === 'syncing'}
      />
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

interface SectionGroup {
  title: string;
  items: SectionItem[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    title: 'GENERAL',
    items: [
      { id: 'connection', label: 'Connection',         icon: Link,       component: ConnectionSettings },
      { id: 'sync',       label: 'Cloud Backup & Sync', icon: RefreshCw, component: CloudSyncSettings },
      { id: 'appearance', label: 'Appearance & Clock', icon: Palette,   component: AppearanceSettings },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { id: 'projects',   label: 'Projects',         icon: FolderGit2,  component: ProjectSettings },
      { id: 'board',      label: 'Board Statuses',   icon: LayoutGrid,  component: BoardStatusesSettings },
      { id: 'labels',     label: 'Global Labels',    icon: Tag,         component: GlobalLabelsSettings },
      { id: 'templates',  label: 'Templates',        icon: FileText,    component: TemplatesSettings },
      { id: 'tasks',      label: 'Task Defaults',    icon: ListTodo,    component: TaskSettings },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'updates',    label: 'Version & Updates', icon: Download,    component: UpdatesSettings },
      { id: 'storage',    label: 'Storage & Cache',  icon: Database,    component: StorageSettings },
    ],
  },
];

const ALL_SECTIONS = SECTION_GROUPS.flatMap((g) => g.items);

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  defaultSection?: string;
}

export function SettingsModal({ open, onClose, defaultSection = 'connection' }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const ActiveComponent = ALL_SECTIONS.find((s) => s.id === activeSection)?.component || ConnectionSettings;

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="2xl" className="max-w-4xl w-[880px] h-[82vh] max-h-[720px] flex flex-col p-0 overflow-hidden">
      {/* ── Modal Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)]/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-xs">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-1)]">Settings & Preferences</h2>
            <p className="text-[11px] text-[var(--text-3)]">Configure GitLab connection, cloud backup, board statuses, projects, and appearance</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          title="Close Settings (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Two-Pane Layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar with Group Titles */}
        <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface-2)]/30 flex flex-col justify-between p-2">
          <nav className="space-y-3 overflow-y-auto">
            {SECTION_GROUPS.map((group) => (
              <div key={group.title} className="space-y-0.5">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] select-none">
                  {group.title}
                </div>
                {group.items.map((s) => {
                  const active = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer',
                        active
                          ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-semibold shadow-xs border border-[var(--accent)]/30'
                          : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]'
                      )}
                    >
                      <s.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="pt-2 border-t border-[var(--border)] px-2 flex items-center justify-between text-xs text-[var(--text-3)]">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </aside>

        {/* Right Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--surface)]">
          <div className="max-w-xl mx-auto">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </Modal>
  );
}

export interface SettingsProps {
  onBack?: () => void;
  open?: boolean;
  onClose?: () => void;
  asModal?: boolean;
}

export default function Settings(props: SettingsProps) {
  const { onBack, open, onClose, asModal } = props;

  // If used as modal
  if (open !== undefined || asModal) {
    return <SettingsModal open={open ?? true} onClose={onClose || onBack || (() => {})} />;
  }

  const [activeSection, setActiveSection] = useState('connection');
  const ActiveComponent = ALL_SECTIONS.find((s) => s.id === activeSection)?.component || ConnectionSettings;

  return (
    <div className="flex h-full bg-[var(--bg)] theme-transition">
      {/* ── Sidebar with Group Titles ── */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-1)]">Settings</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
          {SECTION_GROUPS.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] select-none">
                {group.title}
              </div>
              {group.items.map((s) => {
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
            </div>
          ))}
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

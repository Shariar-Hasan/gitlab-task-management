import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, FolderGit2, FileText, CheckCircle2,
  Lock, RotateCcw, X, Info
} from 'lucide-react';
import { Modal } from './ui/overlay';
import { Button, Input } from './ui/index';

export interface CloudBackupModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (repoName: string) => void;
  defaultRepoName: string;
  currentRepoName?: string;
  loading?: boolean;
}

export default function CloudBackupModal({
  open,
  onClose,
  onConfirm,
  defaultRepoName,
  currentRepoName,
  loading = false,
}: CloudBackupModalProps) {
  const [repoName, setRepoName] = useState(currentRepoName || defaultRepoName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRepoName(currentRepoName || defaultRepoName);
      setError(null);
    }
  }, [open, currentRepoName, defaultRepoName]);

  const handleSave = () => {
    const trimmed = repoName.trim();
    if (!trimmed) {
      setError('Repository name cannot be empty');
      return;
    }
    // GitLab project path constraints
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      setError('Repository name can only contain letters, digits, underscores, dashes, and dots');
      return;
    }
    onConfirm(trimmed);
  };

  const handleReset = () => {
    setRepoName(defaultRepoName);
    setError(null);
  };

  return (
    <Modal open={open} onClose={onClose} size="md" className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)]/40">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-1)]">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-1)]">Enable Cloud Backup & Sync</h2>
            <p className="text-[11px] text-[var(--text-3)]">Review what will happen before activating</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded-md hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
        {/* What Will Happen List */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
            What will happen when enabled:
          </p>
          <div className="space-y-2 text-[var(--text-2)]">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40">
              <Lock className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text-1)]">Private GitLab Repository:</strong> A private project will be created in your GitLab account (or connected if it already exists). It will <strong>never</strong> be counted or shown in your dashboard tasks.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40">
              <FileText className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text-1)]">Single File Backup (<code>settings.json</code>):</strong> Your custom statuses, global labels, board columns, visible columns, description templates, project overrides, and manual task order will be saved into <code>settings.json</code>.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text-1)]">Zero Sensitive Data Exposure:</strong> Your GitLab Personal Access Token, passwords, and task bodies are never exported or written to this backup.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40">
              <RotateCcw className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text-1)]">Automated Commits & Restore:</strong> Commits will push automatically according to your frequency (on change, hourly, or daily). You can restore all settings on any device with one click.
              </div>
            </div>
          </div>
        </div>

        {/* Repository Name Customization */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-[var(--text-1)] flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-[var(--accent)]" />
              Backup Repository Name
            </label>
            {repoName !== defaultRepoName && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
              >
                Reset to default
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={repoName}
              onChange={(e) => {
                setRepoName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={defaultRepoName}
              className="h-8 text-xs font-mono"
            />
          </div>
          {error ? (
            <p className="text-[11px] text-red-500 font-medium">{error}</p>
          ) : (
            <p className="text-[10px] text-[var(--text-3)]">
              You can customize the name of the backup repository or keep the default.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]/40">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={loading} className="gap-1.5 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          {loading ? 'Activating...' : 'Enable Cloud Backup'}
        </Button>
      </div>
    </Modal>
  );
}

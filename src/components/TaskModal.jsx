import React, { useState, useEffect } from 'react';
import { Plus, X, Tag, Check, Calendar, FolderGit2, CircleDot, User, Loader2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/overlay.jsx';
import { Button, Input, Label, Select, Badge } from './ui/index.jsx';
import MarkdownEditor from './ui/MarkdownEditor.jsx';
import { useToast } from './ui/overlay.jsx';
import useStore from '../store/useStore.js';
import { cn, getVisibleGlobalLabels, getDueDateInfo, getDueDateBadgeClass } from '../lib/utils.js';
import { TASK_STATUSES, getEffectiveStatus } from '../lib/localStore.js';

export default function TaskModal({ open, onClose, editIssue = null }) {
  const {
    projects, createTask, updateTask, globalLabels,
    customStatuses, setTaskStatus, fetchMembersForProject,
    currentUser, addGlobalLabel, appSettings,
  } = useStore();
  const toast = useToast();
  const isEditing = !!editIssue;

  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    due_date: '',
    status: 'open',
    assignee_id: '',
    labels: [],
  });

  const [members, setMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#10b981');

  // Initialize form state
  useEffect(() => {
    if (open) {
      setShowAddLabel(false);
      if (isEditing) {
        const effStatus = getEffectiveStatus(editIssue, customStatuses);
        const currentAssigneeId = editIssue.assignees?.[0]?.id
          ? String(editIssue.assignees[0].id)
          : (editIssue.assignee?.id ? String(editIssue.assignee.id) : '');

        setForm({
          title: editIssue.title || '',
          description: editIssue.description || '',
          project_id: String(editIssue.project_id || ''),
          due_date: editIssue.due_date || '',
          status: effStatus,
          assignee_id: currentAssigneeId,
          labels: getVisibleGlobalLabels(editIssue.labels, globalLabels),
        });
      } else {
        const defaultProj = projects[0] ? String(projects[0].id) : '';
        const defaultAssignee = appSettings.autoAssignOnCreate && currentUser ? String(currentUser.id) : '';
        setForm({
          title: '',
          description: '',
          project_id: defaultProj,
          due_date: '',
          status: 'open',
          assignee_id: defaultAssignee,
          labels: [],
        });
      }
    }
  }, [open, editIssue, globalLabels, isEditing, customStatuses, projects, currentUser, appSettings]);

  // Load members when project changes
  useEffect(() => {
    if (form.project_id) {
      fetchMembersForProject(form.project_id)
        .then((m) => setMembers(Array.isArray(m) ? m : []))
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [form.project_id, fetchMembersForProject]);

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const setPresetDueDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setField('due_date', d.toISOString().split('T')[0]);
  };

  const toggleLabel = (label) => {
    const isSelected = form.labels.some((l) => l.name.toLowerCase() === label.name.toLowerCase());
    if (isSelected) {
      setField('labels', form.labels.filter((l) => l.name.toLowerCase() !== label.name.toLowerCase()));
    } else {
      setField('labels', [...form.labels, label]);
    }
  };

  const handleCreateAndSelectLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const created = addGlobalLabel({ name: newLabelName.trim(), color: newLabelColor });
      setField('labels', [...form.labels, created]);
      setNewLabelName('');
      setShowAddLabel(false);
      toast({ type: 'success', message: `✓ Tag "${created.name}" created` });
    } catch (err) {
      toast({ type: 'error', message: err.message });
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || (!isEditing && !form.project_id)) return;
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: form.due_date || null,
      labels: form.labels.map((l) => l.name).join(','),
      assignee_ids: form.assignee_id ? [Number(form.assignee_id)] : [],
    };

    try {
      if (isEditing) {
        await updateTask(editIssue.project_id, editIssue.iid, payload);
        if (form.status) {
          await setTaskStatus(editIssue.project_id, editIssue.iid, form.status);
        }
        toast({ type: 'success', message: '✓ Task updated successfully' });
      } else {
        const created = await createTask(form.project_id, payload);
        if (created?.iid && form.status && form.status !== 'open') {
          await setTaskStatus(Number(form.project_id), created.iid, form.status);
        }
        toast({ type: 'success', message: '✓ Task created successfully' });
      }
      onClose();
    } catch (err) {
      toast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = form.title.trim().length > 0 && (isEditing || form.project_id);
  const selectedProj = projects.find((p) => String(p.id) === String(form.project_id));
  const dueInfo = form.due_date ? getDueDateInfo(form.due_date) : null;

  return (
    <Modal open={open} onClose={onClose} size="2xl">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-1)]">
              {isEditing ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs text-[var(--text-3)]">
              {isEditing
                ? `Editing task in ${selectedProj?.name || 'Project'}`
                : 'Fill in details below. Only labels support multi-selection.'}
            </p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Task Title */}
        <div>
          <Label htmlFor="task-title" className="font-semibold text-xs text-[var(--text-1)]">
            Task Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="task-title"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="What needs to be done?"
            className="text-sm font-medium h-10 px-3.5"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit && !e.shiftKey) handleSubmit();
            }}
          />
        </div>

        {/* Task Description (Rich Markdown Editor with GitLab Photo Upload) */}
        <div>
          <Label htmlFor="task-desc" className="font-semibold text-xs text-[var(--text-1)]">
            Description
          </Label>
          <MarkdownEditor
            value={form.description}
            onChange={(val) => setField('description', val)}
            projectId={form.project_id}
            placeholder="Add description, checklist, or acceptance criteria (Markdown supported). You can paste or drop photos here to upload directly to GitLab..."
            rows={5}
          />
        </div>

        {/* Selectable Attributes Grid (All single-selectable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40">
          {/* 1. Project Selector */}
          <div>
            <Label htmlFor="task-project" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)]">
              <FolderGit2 className="h-3.5 w-3.5 text-[var(--accent)]" /> Project <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Select
                id="task-project"
                value={form.project_id}
                onChange={(e) => setField('project_id', e.target.value)}
                disabled={isEditing}
                className="h-9 text-xs pl-3"
              >
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* 2. Status Selector */}
          <div>
            <Label htmlFor="task-status" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)]">
              <CircleDot className="h-3.5 w-3.5 text-[var(--accent)]" /> Status
            </Label>
            <Select
              id="task-status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              className="h-9 text-xs pl-3"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          {/* 3. Assignee Selector */}
          <div>
            <Label htmlFor="task-assignee" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)]">
              <User className="h-3.5 w-3.5 text-[var(--accent)]" /> Assignee
            </Label>
            <Select
              id="task-assignee"
              value={form.assignee_id}
              onChange={(e) => setField('assignee_id', e.target.value)}
              className="h-9 text-xs pl-3"
            >
              <option value="">Unassigned</option>
              {currentUser && (
                <option value={String(currentUser.id)}>
                  {currentUser.name || currentUser.username} (You)
                </option>
              )}
              {members
                .filter((m) => !currentUser || m.id !== currentUser.id)
                .map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name || m.username}
                  </option>
                ))}
            </Select>
          </div>

          {/* 4. Due Date Selector (in one line with presets) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="task-due" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)] !mb-0 cursor-pointer">
                <Calendar className="h-3.5 w-3.5 text-[var(--accent)]" /> Due Date
              </Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPresetDueDate(0)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer font-medium"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDueDate(1)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer font-medium"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDueDate(7)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer font-medium"
                >
                  Next Week
                </button>
                {form.due_date && (
                  <button
                    type="button"
                    onClick={() => setField('due_date', '')}
                    className="text-[10px] px-1.5 py-0.5 text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="relative flex items-center">
              <Input
                id="task-due"
                type="date"
                value={form.due_date}
                onChange={(e) => setField('due_date', e.target.value)}
                onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                className="[color-scheme:dark] cursor-pointer h-9 text-xs"
              />
              {dueInfo && (
                <span
                  className={cn(
                    'absolute right-9 pointer-events-none text-[10px] px-1.5 py-0.5 rounded font-medium border hidden sm:inline-block',
                    getDueDateBadgeClass(dueInfo.status)
                  )}
                >
                  {dueInfo.text}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 5. Labels Section (Multi-Selectable, directly in the SAME UI) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Label className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)] !mb-0">
                <Tag className="h-3.5 w-3.5 text-[var(--accent)]" /> Labels (Multi-Select)
              </Label>
              <span className="text-[11px] text-[var(--text-3)] font-normal">
                {form.labels.length > 0 ? `• ${form.labels.length} selected` : '• Click tags to select / deselect'}
              </span>
            </div>
            {form.labels.length > 0 && (
              <button
                type="button"
                onClick={() => setField('labels', [])}
                className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
              >
                Clear all labels
              </button>
            )}
          </div>

          {/* Toggleable label chips in the same UI */}
          <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/30 min-h-[58px] items-center">
            {globalLabels.map((l) => {
              const isSelected = form.labels.some((x) => x.name.toLowerCase() === l.name.toLowerCase());
              return (
                <button
                  key={l.id || l.name}
                  type="button"
                  onClick={() => toggleLabel(l)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer select-none',
                    isSelected
                      ? 'shadow-sm font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)]'
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${l.color}22`,
                          color: l.color,
                          borderColor: `${l.color}66`,
                        }
                      : {}
                  }
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: l.color }}
                  />
                  <span>{l.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: l.color }} />}
                </button>
              );
            })}

            {/* Inline "+ New Tag" input */}
            {!showAddLabel ? (
              <button
                type="button"
                onClick={() => setShowAddLabel(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed border-[var(--border)] text-[var(--text-3)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Tag
              </button>
            ) : (
              <div className="flex items-center gap-1.5 p-1 rounded-xl border border-[var(--accent)]/50 bg-[var(--surface)] animate-fade-in">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="New tag..."
                  className="h-7 w-28 px-2 text-xs text-[var(--text-1)] bg-transparent focus:outline-none placeholder:text-[var(--text-3)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateAndSelectLabel();
                    if (e.key === 'Escape') setShowAddLabel(false);
                  }}
                />
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-6 w-6 rounded-md cursor-pointer border border-[var(--border)] p-0 bg-transparent"
                  title="Tag color"
                />
                <button
                  type="button"
                  onClick={handleCreateAndSelectLabel}
                  disabled={!newLabelName.trim()}
                  className="h-7 px-2.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLabel(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--surface-3)] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="px-6 py-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="min-w-[120px] font-semibold"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

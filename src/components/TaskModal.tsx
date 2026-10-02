import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Tag, Check, Calendar, FolderGit2, CircleDot, User, Loader2, Users, FileText } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/overlay';
import { Button, Input, Label, Select, Avatar } from './ui/index';
import MarkdownEditor from './ui/MarkdownEditor';
import FilterSelect from './ui/FilterSelect';
import { useToast } from './ui/overlay';
import useStore from '../store/useStore';
import { cn, getVisibleGlobalLabels, getDueDateInfo, getDueDateBadgeClass } from '../lib/utils';
import { TASK_STATUSES, getEffectiveStatus, localStore } from '../lib/localStore';

export interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  editIssue?: any;
}

export default function TaskModal({ open, onClose, editIssue = null }: TaskModalProps) {
  const {
    projects, projectOverrides, filterProjects, createTask, updateTask, moveTask, globalLabels,
    customStatuses, setTaskStatus, fetchMembersForProject,
    currentUser, addGlobalLabel, appSettings,
  } = useStore();
  const toast = useToast();
  const isEditing = !!editIssue;

  const [form, setForm] = useState<{
    title: string;
    description: string;
    project_id: string;
    due_date: string;
    status: string;
    assignee_ids: string[];
    labels: any[];
  }>({
    title: '',
    description: '',
    project_id: '',
    due_date: '',
    status: 'open',
    assignee_ids: [],
    labels: [],
  });

  const [members, setMembers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#10b981');
  const [templates, setTemplates] = useState<any[]>([]);

  // Load description templates
  useEffect(() => {
    if (open) {
      setTemplates(localStore.getTemplates());
    }
  }, [open]);

  // Project options for FilterSelect (with search and avatars)
  const projectOptions = useMemo(() => {
    return projects
      .filter((p) => {
        const ov = projectOverrides?.[String(p.id)];
        return ov?.enabled !== false;
      })
      .map((p) => {
        const ov = projectOverrides?.[String(p.id)];
        const displayName = ov?.customName || p.name;
        const hue = (p.id * 137) % 360;
        return {
          value: String(p.id),
          label: displayName,
          subtitle: p.path_with_namespace,
          icon: (
            <div className="flex items-center shrink-0">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt=""
                  className="h-4 w-4 rounded object-cover border border-[var(--border)] mr-1.5"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div
                  className="h-4 w-4 rounded flex items-center justify-center text-[8px] font-bold text-white mr-1.5 shrink-0"
                  style={{ background: `hsl(${hue}, 55%, 35%)` }}
                >
                  {(displayName || 'P').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ),
        };
      });
  }, [projects, projectOverrides]);

  // Initialize form state
  useEffect(() => {
    if (open) {
      setShowAddLabel(false);
      if (isEditing) {
        const effStatus = getEffectiveStatus(editIssue, customStatuses);
        const currentAssigneeIds = (editIssue.assignees || (editIssue.assignee ? [editIssue.assignee] : []))
          .map((a: any) => String(a.id));

        setForm({
          title: editIssue.title || '',
          description: editIssue.description || '',
          project_id: String(editIssue.project_id || ''),
          due_date: editIssue.due_date || '',
          status: effStatus,
          assignee_ids: currentAssigneeIds,
          labels: getVisibleGlobalLabels(editIssue.labels, globalLabels),
        });
      } else {
        // Autoselect the first project from active filters if present, or first enabled project
        let defaultProj = '';
        if (filterProjects && filterProjects.length > 0) {
          const matched = projects.find((p) => String(p.id) === String(filterProjects[0]));
          if (matched) defaultProj = String(matched.id);
        }
        if (!defaultProj) {
          const firstEnabled = projects.find((p) => projectOverrides?.[String(p.id)]?.enabled !== false);
          defaultProj = firstEnabled ? String(firstEnabled.id) : (projects[0] ? String(projects[0].id) : '');
        }

        const defaultAssignees = appSettings.autoAssignOnCreate && currentUser ? [String(currentUser.id)] : [];
        setForm({
          title: '',
          description: '',
          project_id: defaultProj,
          due_date: '',
          status: 'open',
          assignee_ids: defaultAssignees,
          labels: [],
        });
      }
    }
  }, [open, editIssue, globalLabels, isEditing, customStatuses, projects, currentUser, appSettings, filterProjects, projectOverrides]);

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

  const setField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const setPresetDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setField('due_date', d.toISOString().split('T')[0]);
  };

  const toggleLabel = (label: any) => {
    setForm((p) => {
      const exists = p.labels.some((l) => (l?.name || '').toLowerCase() === (label?.name || '').toLowerCase());
      return {
        ...p,
        labels: exists
          ? p.labels.filter((l) => (l?.name || '').toLowerCase() !== (label?.name || '').toLowerCase())
          : [...p.labels, label],
      };
    });
  };

  const toggleAssignee = (memberId: string) => {
    setForm((p) => {
      const exists = p.assignee_ids.includes(memberId);
      return {
        ...p,
        assignee_ids: exists
          ? p.assignee_ids.filter((id) => id !== memberId)
          : [...p.assignee_ids, memberId],
      };
    });
  };

  const handleApplyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    if (form.description.trim() && !window.confirm('Apply template? This will replace your current description.')) {
      return;
    }
    setField('description', tpl.content);
    toast({ type: 'info', message: `Loaded template "${tpl.name}"` });
  };

  const handleCreateAndSelectLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const created = addGlobalLabel({ name: newLabelName.trim(), color: newLabelColor });
      toggleLabel(created);
      setNewLabelName('');
      setShowAddLabel(false);
      toast({ type: 'success', message: `✓ Tag "${created.name}" created` });
    } catch (err: any) {
      toast({ type: 'error', message: err.message });
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || (!isEditing && !form.project_id)) return;
    setSubmitting(true);

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: form.due_date || null,
      labels: form.labels.map((l) => l.name).join(','),
      assignee_ids: form.assignee_ids.length > 0 ? form.assignee_ids.map(Number) : [0],
    };

    try {
      if (isEditing) {
        // If user changed the project, move task to the new project!
        if (String(editIssue.project_id) !== String(form.project_id)) {
          await moveTask(editIssue.project_id, editIssue.iid, form.project_id, payload);
          toast({ type: 'success', message: '✓ Task moved to new project' });
        } else {
          await updateTask(editIssue.project_id, editIssue.iid, payload);
          if (form.status) {
            await setTaskStatus(editIssue.project_id, editIssue.iid, form.status);
          }
          toast({ type: 'success', message: '✓ Task updated successfully' });
        }
      } else {
        const created = await createTask(form.project_id, payload);
        if (created?.iid && form.status && form.status !== 'open') {
          await setTaskStatus(Number(form.project_id), created.iid, form.status);
        }
        toast({ type: 'success', message: '✓ Task created successfully' });
      }
      onClose();
    } catch (err: any) {
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
          <div className="h-9 w-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-xs">
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
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="task-desc" className="font-semibold text-xs text-[var(--text-1)] !mb-0">
              Description
            </Label>
            {templates.length > 0 && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-3 w-3 text-[var(--accent)]" />
                <span className="text-[10px] text-[var(--text-3)]">Template:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleApplyTemplate(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="h-6 text-[10px] px-2 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Insert template...</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <MarkdownEditor
            value={form.description}
            onChange={(val) => setField('description', val)}
            projectId={form.project_id}
            placeholder="Add description, checklist, or acceptance criteria (Markdown supported). You can paste or drop photos here to upload directly to GitLab..."
            rows={5}
          />
        </div>

        {/* Selectable Attributes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40">
          {/* 1. Project Selector (Searchable with namespaces and icons) */}
          <div>
            <Label htmlFor="task-project" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)] mb-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-[var(--accent)]" /> Project <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <FilterSelect
                id="task-project"
                value={form.project_id}
                onChange={(val) => setField('project_id', String(val))}
                options={projectOptions}
                placeholder="Choose project..."
                label="Project"
                icon={FolderGit2}
                searchable
                searchPlaceholder="Search projects..."
                width={320}
              />
            </div>
            {isEditing && String(form.project_id) !== String(editIssue.project_id) && (
              <p className="text-[10px] text-[var(--accent)] mt-1">
                Note: Changing project will move this task to the selected project.
              </p>
            )}
          </div>

          {/* 2. Status Selector */}
          <div>
            <Label htmlFor="task-status" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)] mb-1.5">
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

          {/* 3. Assignees Selector (Multi-Selectable with Search) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="task-assignee" className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-1)] !mb-0">
                <Users className="h-3.5 w-3.5 text-[var(--accent)]" /> Assignees
                {form.assignee_ids.length > 0 && (
                  <span className="text-[10px] text-[var(--accent)] font-mono">({form.assignee_ids.length})</span>
                )}
              </Label>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => toggleAssignee(String(currentUser.id))}
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded transition-colors font-medium cursor-pointer',
                    form.assignee_ids.includes(String(currentUser.id))
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-3)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                  )}
                >
                  {form.assignee_ids.includes(String(currentUser.id)) ? 'Assigned to You' : '+ Assign to Me'}
                </button>
              )}
            </div>
            <FilterSelect
              id="task-assignees"
              value={form.assignee_ids}
              onChange={(val) => setField('assignee_ids', Array.isArray(val) ? val.map(String) : [])}
              options={members.map((m) => ({
                value: String(m.id),
                label: m.name || m.username,
                subtitle: m.username ? `@${m.username}` : undefined,
                icon: (
                  <Avatar
                    src={m.avatar_url}
                    name={m.name || m.username}
                    size="sm"
                    className="mr-1.5"
                  />
                ),
              }))}
              placeholder="Assign members..."
              label="Assignees"
              icon={Users}
              allLabel="None"
              searchable
              searchPlaceholder="Search members..."
              isMulti
              width={280}
            />
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
                onClick={(e: any) => { try { e.target.showPicker?.(); } catch {} }}
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
                      ? 'shadow-xs font-semibold'
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
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
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
                  className="h-7 px-2.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-xs"
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

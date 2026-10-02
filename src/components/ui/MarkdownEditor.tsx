import React, { useState, useRef, useCallback } from 'react';
import { marked } from 'marked';
import {
  Bold, Italic, Strikethrough, Heading3, Quote,
  Code, FileCode, List, ListOrdered, CheckSquare,
  Link2, Image as ImageIcon, Eye, Edit3, Loader2,
  Paperclip, Columns,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import useStore from '../../store/useStore';
import { useToast } from './overlay';

// Configure marked for safe GFM
marked.setOptions({
  gfm: true,
  breaks: true,
});

export interface MarkdownEditorProps {
  value?: string;
  onChange?: (val: string) => void;
  projectId?: string | number;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function MarkdownEditor({
  value = '',
  onChange,
  projectId,
  placeholder = 'Add description, notes, or markdown...',
  rows = 5,
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'split' | 'preview'>('split');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const { uploadFileToProject, instanceUrl, projects } = useStore();

  const currentProject = projects.find((p) => String(p.id) === String(projectId));

  // Helper to insert markdown text at cursor or wrap selection
  const insertFormatting = useCallback((prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selected = currentVal.substring(start, end) || defaultText;

    const replacement = `${prefix}${selected}${suffix}`;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    onChange?.(nextVal);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  }, [onChange]);

  // Upload handler for photos / attachments
  const handleUploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (!projectId) {
      toast({ type: 'warning', message: 'Please select a project before uploading photos.' });
      return;
    }

    const textarea = textareaRef.current;
    const imageFiles = Array.from(files);

    setUploading(true);

    for (const file of imageFiles) {
      const placeholderText = `![Uploading ${file.name}...]()`;
      const currentVal = textarea ? textarea.value : value;
      const startPos = textarea ? textarea.selectionStart : currentVal.length;

      // Insert placeholder
      const withPlaceholder =
        currentVal.substring(0, startPos) +
        `\n${placeholderText}\n` +
        currentVal.substring(startPos);
      onChange?.(withPlaceholder);

      try {
        const uploadResult = await uploadFileToProject(projectId, file);

        // Direct remote server link (uploaded directly to GitLab server, zero local storage)
        const finalMarkdown =
          uploadResult.server_markdown ||
          uploadResult.markdown ||
          `![${uploadResult.alt || file.name}](${uploadResult.full_server_url || uploadResult.url})`;

        // Replace placeholder with final markdown containing server link
        const updatedVal = (textarea ? textarea.value : withPlaceholder).replace(
          placeholderText,
          finalMarkdown
        );
        onChange?.(updatedVal);
        toast({
          type: 'success',
          message: `✓ Uploaded to GitLab server (${file.name})`,
        });
      } catch (err: any) {
        toast({ type: 'error', message: err.message || 'Failed to upload photo' });
        // Remove placeholder on failure
        const revertedVal = (textarea ? textarea.value : withPlaceholder).replace(
          `\n${placeholderText}\n`,
          ''
        );
        onChange?.(revertedVal);
      }
    }

    setUploading(false);
  }, [projectId, uploadFileToProject, value, onChange, toast]);

  // Clipboard paste listener for images (Ctrl+V screenshot / photo)
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleUploadFiles(imageFiles);
    }
  }, [handleUploadFiles]);

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleUploadFiles(files);
    }
  }, [handleUploadFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Resolve preview HTML with full image URLs for preview mode
  const getRenderedHtml = () => {
    if (!value.trim()) {
      return '<p class="text-[var(--text-3)] italic text-xs">Nothing to preview</p>';
    }

    // Replace any legacy relative GitLab uploads with full remote URL in preview
    let processedMarkdown = value;
    if (instanceUrl) {
      const baseUrl = instanceUrl.replace(/\/$/, '');
      const projectPath = currentProject?.path_with_namespace || currentProject?.name || '';
      const prefix = projectPath ? `${baseUrl}/${projectPath}/uploads/` : `${baseUrl}/uploads/`;
      processedMarkdown = processedMarkdown.replace(
        /\]\(\/uploads\//g,
        `](${prefix}`
      );
    }

    try {
      return marked.parse(processedMarkdown) as string;
    } catch {
      return '<p class="text-red-500 text-xs">Error parsing markdown preview</p>';
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-150',
        dragOver && 'ring-2 ring-[var(--accent)] border-[var(--accent)]',
        className
      )}
    >
      {/* ── Toolbar Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-xs flex-wrap gap-1">
        {/* Write / Preview Tab Switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface-3)]/60 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              mode === 'write'
                ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-xs font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            )}
          >
            <Edit3 className="h-3 w-3" /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode('split')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              mode === 'split'
                ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            )}
            title="Live side-by-side preview"
          >
            <Columns className="h-3 w-3" /> Split
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              mode === 'preview'
                ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-xs font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            )}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>

        {/* Formatting Actions (Active in Write or Split Mode) */}
        {mode !== 'preview' && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**', 'bold text')}
              title="Bold (Ctrl+B)"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*', 'italic text')}
              title="Italic (Ctrl+I)"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
              title="Strikethrough"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>

            <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('### ', '\n', 'Heading')}
              title="Heading 3"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ', '\n', 'Quote')}
              title="Blockquote"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`', 'code')}
              title="Inline Code"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```', 'code block')}
              title="Code Block"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <FileCode className="h-3.5 w-3.5" />
            </button>

            <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('- ', '\n', 'List item')}
              title="Bullet List"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('1. ', '\n', 'List item')}
              title="Numbered List"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- [ ] ', '\n', 'Task item')}
              title="Task List / Checklist"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('[', '](https://)', 'Link text')}
              title="Insert Link"
              className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>

            <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

            {/* Upload Photo Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleUploadFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload photo / attachment to GitLab (or drag & drop / paste)"
              className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-muted)] hover:bg-[var(--accent)]/20 text-[var(--accent)] font-medium text-[11px] transition-colors cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              <span>Upload Photo</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Editor Body ── */}
      {mode === 'split' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] min-h-[160px]">
          {/* Left Editor */}
          <div
            className="relative flex flex-col"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <textarea
              ref={textareaRef}
              rows={rows}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="w-full flex-1 p-3 text-xs text-[var(--text-1)] bg-transparent resize-y focus:outline-none placeholder:text-[var(--text-3)] leading-relaxed font-mono min-h-[140px]"
            />
            {dragOver && (
              <div className="absolute inset-0 bg-[var(--accent-muted)]/90 backdrop-blur-xs border-2 border-dashed border-[var(--accent)] flex flex-col items-center justify-center gap-2 pointer-events-none z-10 animate-fade-in">
                <ImageIcon className="h-8 w-8 text-[var(--accent)] animate-bounce" />
                <p className="text-xs font-semibold text-[var(--accent)]">Drop photos here</p>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-1 text-[10px] text-[var(--text-3)] border-t border-[var(--border)]/40 bg-[var(--surface-2)]/20 mt-auto">
              <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> Paste/Drop photos</span>
              <span className="font-medium text-[var(--accent)]">Editor</span>
            </div>
          </div>

          {/* Right Live Preview */}
          <div className="p-3 overflow-y-auto max-h-[350px] bg-[var(--surface)]/40 flex flex-col">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[var(--border)]/40">
              <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider">Live Preview</span>
              <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-muted)] px-1.5 py-0.2 rounded font-medium">Real-time</span>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'IMG') {
                  const img = target as HTMLImageElement;
                  if (img.src) window.open(img.src, '_blank', 'noopener,noreferrer');
                }
              }}
              className="space-y-2 text-xs leading-relaxed flex-1 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_p]:text-xs [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-[var(--surface-3)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-[var(--surface-3)] [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_img]:max-h-48 [&_img]:rounded-lg [&_img]:border [&_img]:border-[var(--border)]"
            />
          </div>
        </div>
      ) : mode === 'write' ? (
        <div
          className="relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full p-3 text-xs text-[var(--text-1)] bg-transparent resize-y focus:outline-none placeholder:text-[var(--text-3)] leading-relaxed font-mono min-h-[120px]"
          />

          {/* Drag & drop overlay */}
          {dragOver && (
            <div className="absolute inset-0 bg-[var(--accent-muted)]/90 backdrop-blur-xs border-2 border-dashed border-[var(--accent)] flex flex-col items-center justify-center gap-2 pointer-events-none z-10 animate-fade-in">
              <ImageIcon className="h-8 w-8 text-[var(--accent)] animate-bounce" />
              <p className="text-xs font-semibold text-[var(--accent)]">
                Drop photos here to upload directly to GitLab
              </p>
            </div>
          )}

          {/* Footer Info / Hint */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-[var(--text-3)] border-t border-[var(--border)]/40 bg-[var(--surface-2)]/20">
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Paste (Ctrl+V) or drop photos to upload directly to GitLab
            </span>
            <span>Markdown supported</span>
          </div>
        </div>
      ) : (
        <div className="p-4 min-h-[140px] max-h-[350px] overflow-y-auto prose dark:prose-invert max-w-none text-xs leading-relaxed">
          <div
            dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'IMG') {
                const img = target as HTMLImageElement;
                if (img.src) {
                  window.open(img.src, '_blank', 'noopener,noreferrer');
                }
              }
            }}
            title="Click image to open original on GitLab server"
            className="space-y-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_p]:text-xs [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-[var(--surface-3)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-[var(--surface-3)] [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_img]:max-h-60 [&_img]:rounded-lg [&_img]:border [&_img]:border-[var(--border)] [&_img]:cursor-pointer [&_img]:hover:ring-2 [&_img]:hover:ring-[var(--accent)] [&_img]:transition-all"
          />
        </div>
      )}
    </div>
  );
}

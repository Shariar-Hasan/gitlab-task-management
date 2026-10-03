import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, Pilcrow,
  List, ListOrdered, CheckSquare, Quote,
  Code, FileCode, Link2, Image as ImageIcon,
  Table as TableIcon, Minus, RemoveFormatting,
  Eye, Code2, Edit3, Loader2, Paperclip,
  Check, X, ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import useStore from '../../store/useStore';
import { useToast } from './overlay';

// Configure marked for converting legacy markdown to HTML
marked.setOptions({
  gfm: true,
  breaks: true,
});

export interface HtmlEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  projectId?: string | number;
  placeholder?: string;
  rows?: number;
  className?: string;
  minHeight?: string;
}

/**
 * Check if the content is raw Markdown rather than HTML
 */
export function isMarkdownContent(content: string): boolean {
  if (!content || !content.trim()) return false;
  // If it already contains HTML elements like <p>, <div>, <h1>-<h6>, <ul>, <ol>, <table>, <pre>, <blockquote>, <strong>, <em>, <a>, <img>
  const hasHtmlTag = /<\/?(p|div|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|pre|code|blockquote|strong|em|u|s|strike|a|img|hr|br)\b[^>]*>/i.test(content);
  if (hasHtmlTag) return false;

  // Check for common Markdown patterns
  const hasMarkdownPatterns = /(^|\n)(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|- \[[ xX]\])|(\*\*|__|\*|_|~~|`|!\[.*?\]\(.*?\)|\[.*?\]\(.*?\))/m.test(content);
  return hasMarkdownPatterns;
}

/**
 * Normalize input: if it's markdown, parse it to clean HTML.
 * If empty, returns empty string.
 */
export function normalizeToHtml(content: string): string {
  if (!content || !content.trim()) return '';
  if (isMarkdownContent(content)) {
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  }
  return content;
}

export default function HtmlEditor({
  value = '',
  onChange,
  projectId,
  placeholder = 'Type your task description, notes, or HTML...',
  className,
  minHeight = '180px',
}: HtmlEditorProps) {
  // Modes: 'visual' (WYSIWYG contenteditable), 'source' (raw HTML code textarea), 'preview' (rendered HTML)
  const [mode, setMode] = useState<'visual' | 'source' | 'preview'>('visual');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Link dialog modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const savedSelectionRange = useRef<Range | null>(null);

  // References
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastHtmlRef = useRef<string>('');
  const isInternalChangeRef = useRef<boolean>(false);

  const toast = useToast();
  const { uploadFileToProject, instanceUrl, projects } = useStore();
  const currentProject = projects.find((p) => String(p.id) === String(projectId));

  // Sync incoming value to editor contenteditable container
  useEffect(() => {
    const targetHtml = normalizeToHtml(value);
    if (editorRef.current && targetHtml !== lastHtmlRef.current) {
      if (!isInternalChangeRef.current) {
        editorRef.current.innerHTML = targetHtml;
        lastHtmlRef.current = targetHtml;
      }
    }
    isInternalChangeRef.current = false;
  }, [value]);

  // Execute a document formatting command safely
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (mode !== 'visual') return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleEditorInput();
  };

  // Called when user types or modifies content in the WYSIWYG editor
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    // Check if essentially empty (e.g. <br>, <p><br></p>)
    const cleaned = html === '<p><br></p>' || html === '<br>' ? '' : html;
    lastHtmlRef.current = cleaned;
    isInternalChangeRef.current = true;
    onChange?.(cleaned);
  }, [onChange]);

  // Handle changes in raw HTML source mode
  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    lastHtmlRef.current = newHtml;
    isInternalChangeRef.current = true;
    onChange?.(newHtml);
  };

  // Save selection before opening link modal
  const openLinkDialog = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
      const selected = sel.toString();
      setLinkText(selected);
    } else {
      savedSelectionRange.current = null;
      setLinkText('');
    }
    setLinkUrl('');
    setShowLinkModal(true);
  };

  // Insert link from dialog
  const handleInsertLink = () => {
    setShowLinkModal(false);
    if (!linkUrl.trim()) return;

    editorRef.current?.focus();
    if (savedSelectionRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelectionRange.current);
    }

    const textToDisplay = linkText.trim() || linkUrl.trim();
    const safeUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline hover:opacity-80">${textToDisplay}</a>`;

    document.execCommand('insertHTML', false, linkHtml);
    handleEditorInput();
  };

  // Insert interactive table
  const insertTable = (rows = 3, cols = 3) => {
    editorRef.current?.focus();
    let tableHtml = '<table class="w-full my-3 border-collapse border border-[var(--border)] text-xs rounded-lg overflow-hidden">';
    tableHtml += '<thead><tr class="bg-[var(--surface-2)]">';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th class="border border-[var(--border)] px-3 py-1.5 font-semibold text-left text-[var(--text-1)]">Header ${c}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r <= rows; r++) {
      tableHtml += '<tr class="hover:bg-[var(--surface-2)]/40 transition-colors">';
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td class="border border-[var(--border)] px-3 py-1.5 text-[var(--text-2)]">Cell ${r},${c}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';

    document.execCommand('insertHTML', false, tableHtml);
    handleEditorInput();
  };

  // Insert Checklist / Task item
  const insertChecklist = () => {
    editorRef.current?.focus();
    const taskHtml = `
      <ul class="task-list my-2 space-y-1.5 list-none pl-1">
        <li class="flex items-center gap-2 text-xs">
          <input type="checkbox" class="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer" />
          <span>Task item 1</span>
        </li>
        <li class="flex items-center gap-2 text-xs">
          <input type="checkbox" class="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer" />
          <span>Task item 2</span>
        </li>
      </ul>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, taskHtml);
    handleEditorInput();
  };

  // Insert Code Block
  const insertCodeBlock = () => {
    editorRef.current?.focus();
    const codeHtml = `
      <pre class="bg-[var(--surface-2)] border border-[var(--border)] p-3 rounded-xl my-2 overflow-x-auto font-mono text-xs text-[var(--text-1)]"><code>// Write code or snippet here</code></pre>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, codeHtml);
    handleEditorInput();
  };

  // Insert Inline Code
  const insertInlineCode = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    const text = sel ? sel.toString() : 'code';
    const codeHtml = `<code class="bg-[var(--surface-3)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--accent)]">${text || 'code'}</code>`;
    document.execCommand('insertHTML', false, codeHtml);
    handleEditorInput();
  };

  // Upload handler for photos / attachments
  const handleUploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (!projectId) {
      toast({ type: 'warning', message: 'Please select a project before uploading photos.' });
      return;
    }

    const imageFiles = Array.from(files);
    setUploading(true);

    for (const file of imageFiles) {
      toast({ type: 'info', message: `Uploading ${file.name} to GitLab...` });

      try {
        const uploadResult = await uploadFileToProject(projectId, file);
        const imageUrl = uploadResult.full_server_url || uploadResult.url;
        const altText = uploadResult.alt || file.name;

        // Create clean HTML image element
        const imgHtml = `<p><img src="${imageUrl}" alt="${altText}" class="max-h-72 rounded-xl border border-[var(--border)] shadow-xs my-2 hover:opacity-95 transition-all cursor-pointer inline-block" /></p><p><br></p>`;

        if (mode === 'visual' && editorRef.current) {
          editorRef.current.focus();
          document.execCommand('insertHTML', false, imgHtml);
          handleEditorInput();
        } else {
          // If in source mode or preview
          const updated = (value || '') + '\n' + imgHtml;
          lastHtmlRef.current = updated;
          onChange?.(updated);
        }

        toast({
          type: 'success',
          message: `✓ Uploaded to GitLab server (${file.name})`,
        });
      } catch (err: any) {
        toast({ type: 'error', message: err.message || 'Failed to upload photo' });
      }
    }

    setUploading(false);
  }, [projectId, uploadFileToProject, mode, value, onChange, toast, handleEditorInput]);

  // Clipboard paste listener for images (Ctrl+V screenshot / photo)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
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

  // Handle clicking checkbox in visual mode to toggle state in HTML
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      if (checkbox.checked) {
        checkbox.setAttribute('checked', 'checked');
      } else {
        checkbox.removeAttribute('checked');
      }
      handleEditorInput();
    } else if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      if (img.src) window.open(img.src, '_blank', 'noopener,noreferrer');
    }
  };

  // Keyboard shortcut listener inside editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      execCmd('bold');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      execCmd('italic');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      execCmd('underline');
    }
  };

  // Resolve preview HTML with full image URLs for preview mode
  const getRenderedHtml = () => {
    const rawHtml = normalizeToHtml(value);
    if (!rawHtml.trim()) {
      return '<p class="text-[var(--text-3)] italic text-xs">Nothing to preview</p>';
    }

    let processed = rawHtml;
    if (instanceUrl) {
      const baseUrl = instanceUrl.replace(/\/$/, '');
      const projectPath = currentProject?.path_with_namespace || currentProject?.name || '';
      const prefix = projectPath ? `${baseUrl}/${projectPath}/uploads/` : `${baseUrl}/uploads/`;
      processed = processed.replace(/src="\/uploads\//g, `src="${prefix}`);
    }

    return processed;
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-150 relative flex flex-col',
        dragOver && 'ring-2 ring-[var(--accent)] border-[var(--accent)]',
        className
      )}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
    >
      {/* ── Rich Formatting Toolbar ── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]/70 text-xs flex-wrap gap-1">
        {/* Left Toolbar: Formatting Actions */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Paragraph / Heading Styles */}
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<p>')}
            title="Normal Paragraph"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Pilcrow className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h1>')}
            title="Heading 1"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer font-bold text-xs"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h2>')}
            title="Heading 2"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer font-bold text-xs"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h3>')}
            title="Heading 3"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer font-bold text-xs"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

          {/* Inline styles */}
          <button
            type="button"
            onClick={() => execCmd('bold')}
            title="Bold (Ctrl+B)"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('italic')}
            title="Italic (Ctrl+I)"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('underline')}
            title="Underline (Ctrl+U)"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('strikeThrough')}
            title="Strikethrough"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={insertInlineCode}
            title="Inline Code"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Code className="h-3.5 w-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

          {/* Lists & Tasks */}
          <button
            type="button"
            onClick={() => execCmd('insertUnorderedList')}
            title="Bullet List"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertOrderedList')}
            title="Numbered List"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={insertChecklist}
            title="Checklist / Task List"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

          {/* Blocks: Quote, Code block, Table, Divider */}
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<blockquote>')}
            title="Blockquote"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={insertCodeBlock}
            title="Code Block"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <FileCode className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTable(3, 3)}
            title="Insert 3x3 Table"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertHorizontalRule')}
            title="Horizontal Divider"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={openLinkDialog}
            title="Insert Link"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[var(--border)] mx-1" />

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => execCmd('removeFormat')}
            title="Clear Formatting"
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>

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
            title="Upload photo / attachment to GitLab"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-muted)] hover:bg-[var(--accent)]/20 text-[var(--accent)] font-medium text-[11px] transition-colors cursor-pointer ml-1"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Right Toolbar: Visual / HTML Source / Preview Switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface-3)]/60 p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('visual');
              // When switching back to visual, sync current HTML value
              setTimeout(() => {
                if (editorRef.current) {
                  editorRef.current.innerHTML = normalizeToHtml(value);
                }
              }, 0);
            }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              mode === 'visual'
                ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            )}
            title="Visual WYSIWYG Editor"
          >
            <Edit3 className="h-3 w-3" /> Visual
          </button>

          <button
            type="button"
            onClick={() => setMode('source')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              mode === 'source'
                ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            )}
            title="Edit raw HTML code"
          >
            <Code2 className="h-3 w-3" /> HTML Code
          </button>

          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
              mode === 'preview'
                ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            )}
            title="Rendered GitLab HTML Preview"
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
      </div>

      {/* ── Editor Body ── */}
      <div className="relative flex-1 flex flex-col min-h-[160px]">
        {mode === 'visual' ? (
          <div className="relative flex-1 flex flex-col">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onPaste={handlePaste}
              onClick={handleEditorClick}
              onKeyDown={handleKeyDown}
              data-placeholder={placeholder}
              style={{ minHeight }}
              className="p-3.5 text-xs text-[var(--text-1)] leading-relaxed focus:outline-none overflow-y-auto max-h-[420px] flex-1 select-text
                empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-3)] empty:before:pointer-events-none
                [&_h1]:text-base [&_h1]:font-bold [&_h1]:my-2 [&_h1]:text-[var(--text-1)]
                [&_h2]:text-sm [&_h2]:font-bold [&_h2]:my-1.5 [&_h2]:text-[var(--text-1)]
                [&_h3]:text-xs [&_h3]:font-bold [&_h3]:my-1 [&_h3]:text-[var(--text-1)]
                [&_p]:my-1 [&_p]:leading-relaxed
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5
                [&_li]:my-0.5
                [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-[var(--text-2)]
                [&_hr]:my-3 [&_hr]:border-[var(--border)]
                [&_a]:text-[var(--accent)] [&_a]:underline
                [&_img]:max-h-72 [&_img]:rounded-xl [&_img]:border [&_img]:border-[var(--border)] [&_img]:my-2
              "
            />

            {/* Footer with helpful hints */}
            <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-[var(--text-3)] border-t border-[var(--border)]/40 bg-[var(--surface-2)]/20 mt-auto">
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> WYSIWYG HTML Mode • Paste (Ctrl+V) or drop photos to upload directly to GitLab
              </span>
              <span className="font-mono text-[var(--accent)] font-medium">HTML Editor</span>
            </div>
          </div>
        ) : mode === 'source' ? (
          <div className="relative flex-1 flex flex-col">
            <textarea
              value={value}
              onChange={handleSourceChange}
              onPaste={handlePaste}
              style={{ minHeight }}
              placeholder="<div>Enter raw HTML code here...</div>"
              className="w-full flex-1 p-3.5 text-xs text-[var(--text-1)] bg-transparent resize-y focus:outline-none font-mono leading-relaxed placeholder:text-[var(--text-3)] max-h-[420px]"
            />
            <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-[var(--text-3)] border-t border-[var(--border)]/40 bg-[var(--surface-2)]/20">
              <span>Edit raw HTML directly. Tags like &lt;p&gt;, &lt;h1&gt;, &lt;table&gt;, &lt;img&gt; are preserved.</span>
              <span className="font-mono text-[var(--accent)]">HTML Source</span>
            </div>
          </div>
        ) : (
          <div className="p-4 overflow-y-auto max-h-[420px] flex-1 text-xs leading-relaxed">
            <div
              dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'IMG') {
                  const img = target as HTMLImageElement;
                  if (img.src) window.open(img.src, '_blank', 'noopener,noreferrer');
                }
              }}
              className="space-y-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_p]:text-xs [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-[var(--surface-3)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-[var(--surface-3)] [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_img]:max-h-72 [&_img]:rounded-lg [&_img]:border [&_img]:border-[var(--border)] [&_img]:cursor-pointer [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-[var(--border)] [&_th]:px-2.5 [&_th]:py-1.5 [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2.5 [&_td]:py-1.5"
            />
          </div>
        )}

        {/* Drag & drop overlay */}
        {dragOver && (
          <div className="absolute inset-0 bg-[var(--accent-muted)]/95 backdrop-blur-xs border-2 border-dashed border-[var(--accent)] flex flex-col items-center justify-center gap-2 pointer-events-none z-20 animate-fade-in">
            <ImageIcon className="h-8 w-8 text-[var(--accent)] animate-bounce" />
            <p className="text-xs font-semibold text-[var(--accent)]">
              Drop photos here to upload directly to GitLab
            </p>
          </div>
        )}
      </div>

      {/* ── Link Insertion Modal Dialog ── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-4 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 text-[var(--accent)]" /> Insert Link
              </span>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-2)] mb-1 block">Link Text</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. GitLab Documentation"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-2)] mb-1 block">URL (Link destination)</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" /> Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import HtmlEditor, { HtmlEditorProps, isMarkdownContent, normalizeToHtml } from './HtmlEditor';

export { HtmlEditor, isMarkdownContent, normalizeToHtml };
export type { HtmlEditorProps };
export type MarkdownEditorProps = HtmlEditorProps;

// Default export forwards to the HTML-based editor
export default HtmlEditor;

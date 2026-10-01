import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollIndex } from '@/components/motion/ScrollIndex';
import { useI18n } from '@/components/ui/useI18n';

interface ToolItem {
  id: string;
  icon: LucideIcon;
  /** Translation key. */
  label: string;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
}

const TOOLS: (ToolItem | 'divider')[] = [
  { id: 'bold', icon: Bold, label: 'sh.editor.bold', run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive('bold') },
  { id: 'italic', icon: Italic, label: 'sh.editor.italic', run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive('italic') },
  { id: 'strike', icon: Strikethrough, label: 'sh.editor.strike', run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive('strike') },
  'divider',
  { id: 'h2', icon: Heading2, label: 'sh.editor.h2', run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
  { id: 'h3', icon: Heading3, label: 'sh.editor.h3', run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive('heading', { level: 3 }) },
  'divider',
  { id: 'ul', icon: List, label: 'sh.editor.bullet', run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive('bulletList') },
  { id: 'ol', icon: ListOrdered, label: 'sh.editor.numbered', run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive('orderedList') },
  { id: 'quote', icon: Quote, label: 'sh.editor.quote', run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive('blockquote') },
  { id: 'code', icon: Code2, label: 'sh.editor.code', run: (e) => e.chain().focus().toggleCodeBlock().run(), active: (e) => e.isActive('codeBlock') },
  'divider',
  { id: 'undo', icon: Undo2, label: 'sh.editor.undo', run: (e) => e.chain().focus().undo().run() },
  { id: 'redo', icon: Redo2, label: 'sh.editor.redo', run: (e) => e.chain().focus().redo().run() },
];

export function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 260,
  toolbar = true,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  toolbar?: boolean;
  className?: string;
}): JSX.Element {
  const { t } = useI18n();
  // Read through a ref so the hint follows a language switch without
  // rebuilding the editor.
  const hint = placeholder ?? t('sh.editor.placeholder');
  const placeholderRef = useRef(hint);
  placeholderRef.current = hint;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: () => placeholderRef.current }),
    ],
    content: value,
    editorProps: { attributes: { class: 'tiptap' } },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Repaint the empty-state hint when it changes (e.g. language switch).
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr);
  }, [editor, hint]);

  // Sync external content changes (switching records) without clobbering typing.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {toolbar && editor ? (
        <div className="mb-3 flex flex-wrap items-center gap-0.5 rounded-[6px] bg-[rgb(var(--tint-rgb)/0.02)] p-1 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
          {TOOLS.map((tool, i) =>
            tool === 'divider' ? (
              // eslint-disable-next-line react/no-array-index-key
              <span key={`d${i}`} className="mx-1 h-4 w-px bg-graphite" aria-hidden />
            ) : (
              <button
                key={tool.id}
                type="button"
                aria-label={t(tool.label)}
                title={t(tool.label)}
                aria-pressed={tool.active?.(editor) ?? false}
                onClick={() => tool.run(editor)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors duration-100',
                  tool.active?.(editor)
                    ? 'bg-white/10 text-paper'
                    : 'text-fog hover:bg-[rgb(var(--tint-rgb)/0.06)] hover:text-mist',
                )}
              >
                <tool.icon size={14} strokeWidth={1.75} aria-hidden />
              </button>
            ),
          )}
        </div>
      ) : null}

      <div
        className="scroll-y min-h-0 flex-1 rounded-[6px] bg-[rgb(var(--tint-rgb)/0.015)] px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]"
        style={{ minHeight }}
      >
        <ScrollIndex />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

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
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ScrollIndex } from '@/components/motion/ScrollIndex';

interface ToolItem {
  id: string;
  icon: LucideIcon;
  label: string;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
}

const TOOLS: (ToolItem | 'divider')[] = [
  { id: 'bold', icon: Bold, label: 'Bold', run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive('bold') },
  { id: 'italic', icon: Italic, label: 'Italic', run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive('italic') },
  { id: 'strike', icon: Strikethrough, label: 'Strikethrough', run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive('strike') },
  'divider',
  { id: 'h2', icon: Heading2, label: 'Heading 2', run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
  { id: 'h3', icon: Heading3, label: 'Heading 3', run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive('heading', { level: 3 }) },
  'divider',
  { id: 'ul', icon: List, label: 'Bullet list', run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive('bulletList') },
  { id: 'ol', icon: ListOrdered, label: 'Numbered list', run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive('orderedList') },
  { id: 'quote', icon: Quote, label: 'Quote', run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive('blockquote') },
  { id: 'code', icon: Code2, label: 'Code block', run: (e) => e.chain().focus().toggleCodeBlock().run(), active: (e) => e.isActive('codeBlock') },
  'divider',
  { id: 'undo', icon: Undo2, label: 'Undo', run: (e) => e.chain().focus().undo().run() },
  { id: 'redo', icon: Redo2, label: 'Redo', run: (e) => e.chain().focus().redo().run() },
];

export function RichEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: { attributes: { class: 'tiptap' } },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

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
                aria-label={tool.label}
                title={tool.label}
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

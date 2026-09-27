import { Cloud, FileArchive, FileText, HardDrive, Image as ImageIcon, Loader2, Paperclip, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { ACCEPTED_TYPES, attachmentKind, totalCloudBytes, uploadAttachment } from '@/data/attachments';
import type { Attachment, ItemType } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { useTeam } from '@/state/teamStore';
import { useRequireAuth } from '@/state/useRequireAuth';
import { useWorkspace } from '@/state/workspaceStore';
import { AttachmentPreview } from './AttachmentPreview';
import { useAttachmentUrl } from './useAttachmentUrl';

function Thumb({ attachment, onOpen }: { attachment: Attachment; onOpen: () => void }): JSX.Element {
  const kind = attachmentKind(attachment);
  const { url } = useAttachmentUrl(kind === 'image' ? attachment : null);
  const { removeAttachment } = useWorkspace();

  const Icon = kind === 'pdf' ? FileText : kind === 'text' ? FileText : kind === 'image' ? ImageIcon : FileArchive;

  return (
    <figure
      data-stagger
      className="group relative m-0 overflow-hidden rounded-[8px] bg-[rgb(var(--tint-rgb)/0.022)] shadow-[inset_0_0_0_1px_var(--color-graphite)] transition-[background-color,box-shadow] duration-150 hover:bg-[rgb(var(--tint-rgb)/0.045)] hover:shadow-[inset_0_0_0_1px_var(--color-smoke)]"
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`Preview ${attachment.name}`}
      >
        <span className="flex h-[92px] items-center justify-center overflow-hidden bg-obsidian">
          {kind === 'image' && url ? (
            <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Icon size={22} strokeWidth={1.4} className="text-smoke" aria-hidden />
          )}
        </span>
        <span className="block px-2.5 py-2">
          <span className="block truncate text-[12px] text-mist">{attachment.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ash">
            {attachment.storagePath ? (
              <Cloud size={10} strokeWidth={1.9} aria-hidden />
            ) : (
              <HardDrive size={10} strokeWidth={1.9} aria-hidden />
            )}
            <span className="num">{formatBytes(attachment.size)}</span>
          </span>
        </span>
      </button>

      <button
        type="button"
        aria-label={`Remove ${attachment.name}`}
        onClick={() => removeAttachment(attachment.id)}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[5px] bg-void/80 text-ash opacity-0 backdrop-blur transition-opacity duration-150 hover:text-coral group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X size={12.5} strokeWidth={2} aria-hidden />
      </button>
    </figure>
  );
}

/**
 * Attach files to whatever is being written, and see them immediately.
 * Uploading requires an account — a signed-out visitor is sent to the sign-in
 * panel instead — so once attached, files always go to Supabase Storage.
 */
export function AttachmentPanel({
  ownerType,
  ownerId,
  ensureOwnerId,
  className,
  compact = false,
}: {
  ownerType: ItemType;
  ownerId: string;
  /** Commits an unsaved draft and returns its real id, so files always land somewhere. */
  ensureOwnerId?: () => string;
  className?: string;
  compact?: boolean;
}): JSX.Element {
  const { workspace, attachmentsFor, addAttachment } = useWorkspace();
  const { user } = useAuth();
  const { activeTeamId } = useTeam();
  const requireAuth = useRequireAuth();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState<Attachment | null>(null);

  const files = attachmentsFor(ownerId);

  const accept = useCallback(
    async (list: FileList | File[] | null) => {
      if (!requireAuth()) return;
      const incoming = Array.from(list ?? []);
      if (incoming.length === 0) return;

      // The owner may still be an unsaved draft; committing it first means a
      // file is never attached to a record that does not exist.
      const target = ensureOwnerId ? ensureOwnerId() : ownerId;
      if (!target || target.startsWith('__')) {
        setErrors(['Give this record a title first, then attach files to it.']);
        return;
      }

      setErrors([]);
      setBusy((n) => n + incoming.length);

      for (const file of incoming) {
        const usedBytes = totalCloudBytes(workspace.attachments);
        const result = await uploadAttachment(file, ownerType, target, activeTeamId, usedBytes);
        if (result.ok) addAttachment(result.attachment);
        else setErrors((prev) => [...prev, result.error]);
        setBusy((n) => n - 1);
      }
    },
    [ownerId, ownerType, ensureOwnerId, activeTeamId, addAttachment, workspace.attachments, requireAuth],
  );

  const triggerFilePicker = (): void => {
    if (!requireAuth()) return;
    input.current?.click();
  };

  return (
    <section
      className={cn('rounded-[8px] p-3 transition-[background-color,box-shadow] duration-150', className)}
      style={
        dragging
          ? { background: 'rgba(228,242,34,0.045)', boxShadow: 'inset 0 0 0 1px rgba(228,242,34,0.4)' }
          : { background: 'rgb(var(--tint-rgb) / 0.02)', boxShadow: 'inset 0 0 0 1px var(--color-graphite)' }
      }
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void accept(e.dataTransfer.files);
      }}
    >
      <header className="mb-2.5 flex items-center gap-2">
        <Paperclip size={12.5} strokeWidth={1.8} className="text-ash" aria-hidden />
        <h3 className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Files</h3>
        {files.length > 0 ? (
          <span className="mono num rounded-[4px] bg-[rgb(var(--tint-rgb)/0.05)] px-1.5 py-[1px] text-[10.5px] text-ash">
            {files.length}
          </span>
        ) : null}
        {busy > 0 ? <Loader2 size={12.5} className="animate-spin text-ash" aria-hidden /> : null}
        <button
          type="button"
          onClick={triggerFilePicker}
          className="ml-auto flex items-center gap-1.5 rounded-[5px] px-2 py-[5px] text-[11.5px] text-ash transition-colors duration-150 hover:bg-[rgb(var(--tint-rgb)/0.06)] hover:text-mist"
        >
          <Upload size={12} strokeWidth={1.9} aria-hidden />
          Add files
        </button>
      </header>

      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          void accept(e.target.files);
          e.target.value = '';
        }}
      />

      {files.length === 0 ? (
        <button
          type="button"
          onClick={triggerFilePicker}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-graphite px-3 py-5 text-center transition-colors duration-150 hover:border-smoke"
        >
          <span className="text-[12.5px] text-mist">Drop files here, or browse</span>
          <span className="text-[11px] leading-[1.5] text-ash">
            {user
              ? 'Images, PDFs and documents up to 50 MB — stored in your cloud bucket'
              : 'Sign in to attach files — up to 50 MB each, backed up to your account'}
          </span>
        </button>
      ) : (
        <div
          className={cn(
            'grid gap-2',
            compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
          )}
        >
          {files.map((attachment) => (
            <Thumb key={attachment.id} attachment={attachment} onOpen={() => setPreviewing(attachment)} />
          ))}
        </div>
      )}

      {errors.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {errors.map((message) => (
            <li key={message} className="text-[11.5px] leading-[1.5] text-coral">
              {message}
            </li>
          ))}
        </ul>
      ) : null}

      {previewing ? (
        <AttachmentPreview
          attachment={previewing}
          onOpenChange={(open) => {
            if (!open) setPreviewing(null);
          }}
        />
      ) : null}
    </section>
  );
}

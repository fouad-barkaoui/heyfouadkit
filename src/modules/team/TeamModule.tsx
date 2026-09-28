import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Crown,
  Link2,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldRow, Label, Select, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { TeamRole } from '@/lib/types';
import { cn, formatDate, relativeTime } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { useTeam } from '@/state/teamStore';
import { MenuButton } from '@/components/shell/MenuButton';
import { ScrollIndex } from '@/components/motion/ScrollIndex';

const ROLE_LABEL: Record<TeamRole, string> = { owner: 'Owner', admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };

const ROLE_HINT: Record<TeamRole, string> = {
  owner: 'Full control, including deleting the team',
  admin: 'Manage members, roles and invites',
  editor: 'Create and edit everything',
  viewer: 'Read-only access',
};

function RoleBadge({ role }: { role: TeamRole }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[4px] px-1.5 py-[2px] text-[11px] capitalize',
        role === 'owner' ? 'bg-acid/15 text-acid' : 'bg-[rgb(var(--tint-rgb)/0.05)] text-fog',
      )}
    >
      {role === 'owner' ? <Crown size={10} strokeWidth={2} /> : null}
      {ROLE_LABEL[role]}
    </span>
  );
}

function CreateTeamModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const { createTeam } = useTeam();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'name' | 'invites'>('name');

  const submit = async (): Promise<void> => {
    if (name.trim().length < 2) {
      setError('Give the team a name of at least 2 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createTeam(name.trim());
    setBusy(false);
    if (result.ok) {
      // Move to invite step instead of closing
      setStep('invites');
    } else {
      setError(result.error);
    }
  };

  const handleClose = (): void => {
    setName('');
    setError(null);
    setStep('name');
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      title={step === 'name' ? 'Create a team' : 'Invite members'}
      description={
        step === 'name'
          ? "You'll be the owner. Invite people once it's created."
          : 'Share the invite link with your team members.'
      }
      footer={
        <>
          <Button onClick={() => handleClose()}>{step === 'invites' ? 'Done' : 'Cancel'}</Button>
          {step === 'name' ? (
            <Button
              variant="primary"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void submit();
              }}
            >
              {busy ? 'Creating...' : 'Create team'}
            </Button>
          ) : null}
        </>
      }
    >
      {step === 'name' ? (
        <FieldRow>
          <Label htmlFor="team-name">Team name</Label>
          <TextInput
            id="team-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Product Team"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {error ? <p className="mt-1.5 text-[12px] text-coral">{error}</p> : null}
        </FieldRow>
      ) : (
        <div className="space-y-2 text-[12px] text-ash">
          <p className="text-mist">Team “{name}” is ready, and it's now your active team.</p>
          <p>
            Use <span className="text-paper">Invite</span> at the top of the team page to add people.
          </p>
        </div>
      )}
    </Modal>
  );
}

function InviteModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element {
  const { createInvite } = useTeam();
  const [role, setRole] = useState<TeamRole>('editor');
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createInvite(role);
    setBusy(false);
    if (result.ok) {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('join', result.token);
      setLink(url.toString());
    } else {
      setError(result.error);
    }
  };

  const copy = async (): Promise<void> => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setLink(null);
          setError(null);
        }
      }}
      title="Invite to the team"
      description="Anyone with this link can join with the role you pick — good for 7 days."
      footer={
        link ? (
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        ) : (
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void generate();
              }}
            >
              {busy ? 'Generating...' : 'Generate link'}
            </Button>
          </>
        )
      }
    >
      {!link ? (
        <FieldRow>
          <Label htmlFor="invite-role">Role for people who join</Label>
          <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            {(['viewer', 'editor', 'admin'] as TeamRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]} — {ROLE_HINT[r]}
              </option>
            ))}
          </Select>
          {error ? <p className="mt-1.5 text-[12px] text-coral">{error}</p> : null}
        </FieldRow>
      ) : (
        <FieldRow>
          <Label htmlFor="invite-link">Invite link</Label>
          <div className="flex items-center gap-2">
            <TextInput id="invite-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
            <IconButton
              label="Copy invite link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void copy();
              }}
            >
              {copied ? (
                <Check size={13.5} strokeWidth={2} className="text-acid" />
              ) : (
                <Copy size={13.5} strokeWidth={1.9} />
              )}
            </IconButton>
          </div>
          <p className="mt-1.5 text-[12px] text-ash">Joins as {ROLE_LABEL[role]}. Share it however you like.</p>
        </FieldRow>
      )}
    </Modal>
  );
}

function RenameTeamModal({
  open,
  current,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  current: string;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<string | null>;
}): JSX.Element {
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(current);
      setError(null);
    }
  }, [open, current]);

  const submit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give the team a name of at least 2 characters.');
      return;
    }
    if (trimmed === current) {
      onOpenChange(false);
      return;
    }
    setBusy(true);
    const err = await onSave(trimmed.slice(0, 80));
    setBusy(false);
    if (err) setError(err);
    else onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Rename team"
      width="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label htmlFor="team-rename">Team name</Label>
        <TextInput
          id="team-rename"
          autoFocus
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        {error ? <p className="mt-1.5 text-[12px] text-coral">{error}</p> : null}
      </FieldRow>
    </Modal>
  );
}

function DeleteTeamModal({
  open,
  teamName,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  teamName: string;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<string | null>;
}): JSX.Element {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTyped('');
      setError(null);
    }
  }, [open]);

  const matches = typed.trim().toLowerCase() === teamName.trim().toLowerCase() && teamName.trim() !== '';

  const submit = async (): Promise<void> => {
    if (!matches || busy) return;
    setBusy(true);
    const err = await onDelete();
    setBusy(false);
    if (err) setError(err);
    else onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete team"
      description="This permanently deletes the team and everything in it — notes, tasks, docs, links, habits and files — for every member."
      width="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            className="!bg-coral !text-white disabled:opacity-40"
            disabled={!matches || busy}
            onClick={() => void submit()}
          >
            {busy ? 'Deleting…' : 'Delete forever'}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label htmlFor="team-delete-confirm">
          Type <span className="text-paper">{teamName}</span> to confirm
        </Label>
        <TextInput
          id="team-delete-confirm"
          autoFocus
          autoComplete="off"
          placeholder={teamName}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
        />
        {error ? <p className="mt-1.5 text-[12px] text-coral">{error}</p> : null}
      </FieldRow>
    </Modal>
  );
}

type Notice = { tone: 'ok' | 'error'; text: string } | null;

export function TeamModule(): JSX.Element {
  const { user } = useAuth();
  const {
    ready,
    teams,
    activeTeam,
    activeTeamId,
    switchTeam,
    myRole,
    canManage,
    members,
    membersLoading,
    setMemberRole,
    removeMember,
    leaveTeam,
    deleteTeam,
    renameTeam,
    invites,
    revokeInvite,
  } = useTeam();

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Phones show one pane at a time: the team list, or the chosen team.
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('detail');

  const isOwner = myRole === 'owner';

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), notice.tone === 'ok' ? 2600 : 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const run = async (
    id: string,
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    okText?: string,
  ): Promise<boolean> => {
    setBusyId(id);
    const res = await action();
    setBusyId(null);
    if (res.ok) {
      if (okText ?? res.message) setNotice({ tone: 'ok', text: okText ?? res.message ?? 'Done.' });
      return true;
    }
    setNotice({ tone: 'error', text: res.error ?? 'Something went wrong.' });
    return false;
  };

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.username.localeCompare(b.username),
      ),
    [members],
  );

  const activeInvites = useMemo(
    () => invites.filter((inv) => !inv.expiresAt || new Date(inv.expiresAt).getTime() > Date.now()),
    [invites],
  );

  const inviteLink = (token: string): string => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('join', token);
    return url.toString();
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:hidden">
          <MenuButton />
          <h1 className="text-[17px] font-medium text-paper">Team</h1>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <EmptyState
            icon={<Users size={18} strokeWidth={1.6} />}
            title="Sign in to use teams"
            hint="Team collaboration is shared across signed-in members — sign in first."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0">
        <aside
          className={cn(
            'h-full min-h-0 w-full shrink-0 flex-col border-r border-graphite bg-void/72 backdrop-blur-2xl md:flex md:w-[248px] lg:w-[286px]',
            mobilePane === 'list' ? 'flex' : 'hidden',
          )}
        >
          <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
            <MenuButton className="md:hidden" />
            <h2 className="flex-1 truncate text-[13px] font-medium tracking-[-0.011em] text-paper">Your teams</h2>
            <Button
              variant="primary"
              icon={<Plus size={14} strokeWidth={2} />}
              onClick={() => setCreateOpen(true)}
              aria-label="Create team"
            >
              New
            </Button>
          </div>

          <div className="scroll-y min-h-0 flex-1 px-3 pb-4">
            {!ready ? (
              <p className="px-2 py-4 text-[12.5px] text-ash">Loading teams…</p>
            ) : teams.length === 0 ? (
              <p className="px-2 py-4 text-[12.5px] text-ash">No teams yet — create one.</p>
            ) : (
              teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-team-row={t.id}
                  onClick={() => {
                    switchTeam(t.id);
                    setMobilePane('detail');
                  }}
                  className={cn(
                    'mb-[3px] flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors duration-120',
                    t.id === activeTeamId ? 'bg-[rgb(var(--tint-rgb)/0.05)]' : 'hover:bg-[rgb(var(--tint-rgb)/0.03)]',
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#e4f222] to-[#9db300] text-[11px] font-semibold text-[#08090a]">
                    {t.name.trim()[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-paper">{t.name}</span>
                    <span className="block truncate text-[11px] capitalize text-ash">{t.role}</span>
                  </span>
                  {t.id === activeTeamId ? (
                    <Check size={14} strokeWidth={2.2} className="shrink-0 text-accent" aria-label="Active" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </aside>

        <section
          className={cn(
            'h-full min-h-0 min-w-0 flex-1 flex-col bg-void/78 backdrop-blur-2xl md:flex',
            mobilePane === 'detail' ? 'flex' : 'hidden',
          )}
        >
          <header className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
            <MenuButton className="md:hidden" />
            <div className="min-w-0 flex-1 basis-[160px]">
              <button
                type="button"
                className="mb-0.5 inline-flex items-center gap-1 text-[11.5px] text-ash hover:text-paper md:hidden"
                onClick={() => setMobilePane('list')}
              >
                <ArrowLeft size={12} strokeWidth={2} /> All teams ({teams.length})
              </button>
              <h1 className="flex items-center gap-1.5 truncate text-[17px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[19px]">
                <span className="truncate">{activeTeam?.name ?? 'No team selected'}</span>
                {activeTeam && canManage ? (
                  <IconButton label="Rename team" className="shrink-0" onClick={() => setRenameOpen(true)}>
                    <Pencil size={13} strokeWidth={1.9} />
                  </IconButton>
                ) : null}
              </h1>
              <p className="mt-1 text-[12.5px] text-ash">
                {members.length} member{members.length === 1 ? '' : 's'}
                {activeInvites.length > 0
                  ? ` · ${activeInvites.length} open invite${activeInvites.length === 1 ? '' : 's'}`
                  : ''}
                {myRole ? ` · you're ${ROLE_LABEL[myRole].toLowerCase()}` : ''}
              </p>
            </div>
            {activeTeam ? (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {canManage ? (
                  <Button
                    variant="primary"
                    icon={<UserPlus size={14} strokeWidth={2} />}
                    onClick={() => setInviteOpen(true)}
                  >
                    Invite
                  </Button>
                ) : null}
                {!isOwner ? (
                  <Button
                    icon={<LogOut size={13.5} strokeWidth={1.9} />}
                    disabled={busyId === 'leave'}
                    onClick={() => {
                      if (!activeTeamId) return;
                      if (
                        !window.confirm(`Leave “${activeTeam.name}”? You'll lose access to its notes, tasks and files.`)
                      )
                        return;
                      void run('leave', () => leaveTeam(activeTeamId), `You left ${activeTeam.name}.`);
                    }}
                  >
                    Leave
                  </Button>
                ) : (
                  <IconButton label="Delete team" danger onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={14} strokeWidth={1.75} />
                  </IconButton>
                )}
              </div>
            ) : null}
          </header>

          {notice ? (
            <div
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'mx-4 mt-3 rounded-[8px] px-3 py-2 text-[12.5px] md:mx-7',
                notice.tone === 'error'
                  ? 'bg-coral/10 text-coral shadow-[inset_0_0_0_1px_rgb(235_87_87/0.35)]'
                  : 'bg-[rgb(39_166_68/0.1)] text-[#3ecf65] shadow-[inset_0_0_0_1px_rgb(39_166_68/0.35)]',
              )}
            >
              {notice.text}
            </div>
          ) : null}

          <div className="scroll-y min-h-0 flex-1 px-4 py-5 md:px-7 md:py-6">
            <ScrollIndex />
            <div className="mx-auto max-w-[760px] space-y-5">
              <div className="flex items-start gap-2.5 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.03)] px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
                <Clock size={14} strokeWidth={1.8} className="mt-[1px] shrink-0 text-accent" aria-hidden />
                <p className="text-[12px] leading-[1.5] text-fog">
                  <span className="font-medium text-mist">Still growing</span> — create, rename and delete teams, invite
                  people, change roles, remove members and cancel invites all work. Shared editing extras are on the
                  way.
                </p>
              </div>

              <div>
                <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Members</p>
                {membersLoading ? (
                  <p className="py-4 text-[12.5px] text-ash">Loading members…</p>
                ) : sortedMembers.length === 0 ? (
                  <p className="py-4 text-[12.5px] text-ash">No members yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedMembers.map((m) => {
                      const isSelf = m.userId === user.id;
                      const displayName = m.username || m.email || 'Member';
                      // Admins manage editors and viewers; owners manage everyone.
                      const canTouch = canManage && !isSelf && (isOwner || (m.role !== 'owner' && m.role !== 'admin'));
                      const roleChoices: TeamRole[] = isOwner
                        ? ['viewer', 'editor', 'admin', 'owner']
                        : ['viewer', 'editor'];
                      return (
                        <div
                          key={m.userId}
                          data-member={displayName}
                          className={cn(
                            'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-2.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]',
                            busyId === m.userId && 'opacity-60',
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e4f222] to-[#9db300] text-[12px] font-semibold text-[#08090a]">
                            {displayName.trim()[0]?.toUpperCase() ?? '?'}
                          </span>
                          <div className="min-w-0 flex-1 basis-[140px]">
                            <p className="truncate text-[13px] text-paper">
                              {displayName} {isSelf ? <span className="text-ash">(you)</span> : null}
                            </p>
                            <p className="truncate text-[11.5px] text-ash">
                              {m.email || '—'} · joined {relativeTime(m.joinedAt)}
                            </p>
                          </div>
                          {canTouch ? (
                            <div className="ml-auto flex items-center gap-1.5">
                              <Select
                                aria-label={`Role for ${displayName}`}
                                value={m.role}
                                disabled={busyId === m.userId}
                                onChange={(e) => {
                                  const role = e.target.value as TeamRole;
                                  void run(
                                    m.userId,
                                    () => setMemberRole(m.userId, role),
                                    `${displayName} is now ${ROLE_LABEL[role].toLowerCase()}.`,
                                  );
                                }}
                                className="w-auto py-1 text-[12px]"
                              >
                                {(roleChoices.includes(m.role) ? roleChoices : [m.role, ...roleChoices]).map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </Select>
                              <ConfirmDelete
                                onConfirm={() =>
                                  void run(m.userId, () => removeMember(m.userId), `${displayName} was removed.`)
                                }
                                label={`Remove ${displayName}`}
                                size={13}
                              />
                            </div>
                          ) : (
                            <span className="ml-auto">
                              <RoleBadge role={m.role} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {canManage ? (
                <div>
                  <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">Open invites</p>
                  {activeInvites.length === 0 ? (
                    <p className="py-2 text-[12.5px] text-ash">No open invites. Use Invite to create a link.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeInvites.map((inv) => (
                        <div
                          key={inv.id}
                          data-invite={inv.id}
                          className={cn(
                            'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-2.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]',
                            busyId === inv.id && 'opacity-60',
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[rgb(var(--tint-rgb)/0.05)] text-fog">
                            <ShieldCheck size={14} strokeWidth={1.8} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1 basis-[140px]">
                            <p className="text-[13px] text-paper">
                              Joins as <span className="capitalize">{ROLE_LABEL[inv.role]}</span>
                            </p>
                            <p className="text-[11.5px] text-ash">
                              {inv.useCount} used · created {formatDate(inv.createdAt)}
                              {inv.expiresAt ? ` · expires ${formatDate(inv.expiresAt)}` : ''}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center gap-1">
                            <IconButton
                              label="Copy invite link"
                              onClick={() => {
                                void navigator.clipboard
                                  ?.writeText(inviteLink(inv.id))
                                  .then(() => {
                                    setCopiedId(inv.id);
                                    window.setTimeout(() => setCopiedId(null), 1600);
                                  })
                                  .catch(() => undefined);
                              }}
                            >
                              {copiedId === inv.id ? (
                                <Check size={13.5} strokeWidth={2} className="text-acid" />
                              ) : (
                                <Link2 size={13.5} strokeWidth={1.9} />
                              )}
                            </IconButton>
                            <ConfirmDelete
                              label="Cancel invite"
                              size={13}
                              onConfirm={() =>
                                void run(
                                  inv.id,
                                  () => revokeInvite(inv.id),
                                  'Invite cancelled — the link no longer works.',
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <CreateTeamModal
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setMobilePane('detail');
        }}
      />
      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
      <DeleteTeamModal
        open={deleteOpen}
        teamName={activeTeam?.name ?? ''}
        onOpenChange={setDeleteOpen}
        onDelete={async () => {
          if (!activeTeamId || !activeTeam) return 'No team selected.';
          const name = activeTeam.name;
          const res = await deleteTeam(activeTeamId);
          if (res.ok) {
            setNotice({ tone: 'ok', text: `“${name}” was deleted.` });
            return null;
          }
          return res.error;
        }}
      />
      <RenameTeamModal
        open={renameOpen}
        current={activeTeam?.name ?? ''}
        onOpenChange={setRenameOpen}
        onSave={async (name) => {
          if (!activeTeamId) return 'No team selected.';
          const res = await renameTeam(activeTeamId, name);
          if (res.ok) {
            setNotice({ tone: 'ok', text: 'Team renamed.' });
            return null;
          }
          return res.error;
        }}
      />
    </>
  );
}

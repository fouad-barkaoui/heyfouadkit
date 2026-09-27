import {
  Check,
  Clock,
  Copy,
  Crown,
  LogOut,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

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

function CreateTeamModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element {
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
          <Button onClick={() => handleClose()}>
            {step === 'invites' ? 'Done' : 'Cancel'}
          </Button>
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
          <p>Team "{name}" has been created!</p>
          <p>Next step: Go to the Team module to invite members and manage roles.</p>
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
              {copied ? <Check size={13.5} strokeWidth={2} className="text-acid" /> : <Copy size={13.5} strokeWidth={1.9} />}
            </IconButton>
          </div>
          <p className="mt-1.5 text-[12px] text-ash">Joins as {ROLE_LABEL[role]}. Share it however you like.</p>
        </FieldRow>
      )}
    </Modal>
  );
}

export function TeamModule(): JSX.Element {
  const { user } = useAuth();
  const {
    ready,
    teams,
    activeTeam,
    activeTeamId,
    switchTeam,
    canManage,
    members,
    membersLoading,
    setMemberRole,
    removeMember,
    leaveTeam,
    invites,
  } = useTeam();

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.username.localeCompare(b.username))),
    [members],
  );

  const activeInvites = useMemo(
    () => invites.filter((inv) => !inv.expiresAt || new Date(inv.expiresAt).getTime() > Date.now()),
    [invites],
  );

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={<Users size={18} strokeWidth={1.6} />}
          title="Sign in to use teams"
          hint="Team collaboration is shared across signed-in members — sign in first."
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0">
        <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-graphite bg-void/72 backdrop-blur-2xl md:w-[248px] lg:w-[286px]">
          <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
            <MenuButton className="md:hidden" />
            <h2 className="flex-1 truncate text-[13px] font-medium tracking-[-0.011em] text-paper">Your teams</h2>
            <IconButton
              label="Create team"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreateOpen(true);
              }}
            >
              <Plus size={15} strokeWidth={1.9} />
            </IconButton>
          </div>

          <div className="scroll-y min-h-0 flex-1 px-3 pb-4">
            {!ready ? (
              <p className="px-2 py-4 text-[12.5px] text-ash">Loading teams…</p>
            ) : (
              teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    switchTeam(t.id);
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
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-void/78 backdrop-blur-2xl">
          <header className="flex flex-wrap items-start gap-x-3 gap-y-2.5 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
            <div className="min-w-0 flex-1 basis-[190px]">
              <h1 className="truncate text-[17px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[19px]">
                {activeTeam?.name ?? 'No team selected'}
              </h1>
              <p className="mt-1 text-[12.5px] text-ash">
                {members.length} member{members.length === 1 ? '' : 's'}
                {activeInvites.length > 0 ? ` · ${activeInvites.length} open invite${activeInvites.length === 1 ? '' : 's'}` : ''}
              </p>
            </div>
            {canManage ? (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Button
                  variant="primary"
                  icon={<UserPlus size={14} strokeWidth={2} />}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInviteOpen(true);
                  }}
                >
                  Invite
                </Button>
              </div>
            ) : null}
          </header>

          <div className="scroll-y min-h-0 flex-1 px-4 py-5 md:px-7 md:py-6">
            <div className="mx-auto max-w-[760px] space-y-5">
              <div className="flex items-start gap-2.5 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.03)] px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]">
                <Clock size={14} strokeWidth={1.8} className="mt-[1px] shrink-0 text-accent" aria-hidden />
                <p className="text-[12px] leading-[1.5] text-fog">
                  <span className="font-medium text-mist">Coming soon</span> — team collaboration is still being
                  polished. Members and invites below already work, but expect changes as this module rounds out.
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
                      return (
                        <div
                          key={m.userId}
                          className="flex items-center gap-3 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-2.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e4f222] to-[#9db300] text-[12px] font-semibold text-[#08090a]">
                            {displayName.trim()[0]?.toUpperCase() ?? '?'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-paper">
                              {displayName} {isSelf ? <span className="text-ash">(you)</span> : null}
                            </p>
                            <p className="truncate text-[11.5px] text-ash">
                              {m.email || '—'} · joined {relativeTime(m.joinedAt)}
                            </p>
                          </div>
                          {canManage && !isSelf ? (
                            <>
                              <Select
                                value={m.role}
                                onChange={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void setMemberRole(m.userId, e.target.value as TeamRole);
                                }}
                                className="w-auto py-1 text-[12px]"
                              >
                                {(['viewer', 'editor', 'admin', 'owner'] as TeamRole[]).map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </Select>
                              <ConfirmDelete
                                onConfirm={() => void removeMember(m.userId)}
                                label="Remove member"
                                size={13}
                              />
                            </>
                          ) : (
                            <RoleBadge role={m.role} />
                          )}
                          {isSelf && m.role !== 'owner' ? (
                            <IconButton
                              label="Leave team"
                              onClick={() => {
                                if (activeTeamId && window.confirm(`Leave ${activeTeam?.name ?? 'this team'}?`)) {
                                  void leaveTeam(activeTeamId);
                                }
                              }}
                            >
                              <LogOut size={13.5} strokeWidth={1.9} />
                            </IconButton>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {canManage && activeInvites.length > 0 ? (
                <div>
                  <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ash">
                    Open invites
                  </p>
                  <div className="space-y-1.5">
                    {activeInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 rounded-[8px] bg-[rgb(var(--tint-rgb)/0.02)] p-2.5 shadow-[inset_0_0_0_1px_var(--color-graphite)]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[rgb(var(--tint-rgb)/0.05)] text-fog">
                          <ShieldCheck size={14} strokeWidth={1.8} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-paper">
                            Joins as <span className="capitalize">{ROLE_LABEL[inv.role]}</span>
                          </p>
                          <p className="text-[11.5px] text-ash">
                            {inv.useCount} used · created {formatDate(inv.createdAt)}
                            {inv.expiresAt ? ` · expires ${formatDate(inv.expiresAt)}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <CreateTeamModal open={createOpen} onOpenChange={setCreateOpen} />
      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}

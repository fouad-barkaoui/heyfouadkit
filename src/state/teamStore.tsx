import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Team, TeamInvite, TeamMember, TeamRole } from '@/lib/types';
import { getSupabase } from '@/data/supabaseClient';
import { useAuth } from './authStore';
import { translate } from './languageStore';

const ACTIVE_TEAM_KEY = 'kanz.activeTeam.v1';

function readStoredTeam(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_TEAM_KEY);
  } catch {
    return null;
  }
}

function writeStoredTeam(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ACTIVE_TEAM_KEY, id);
    else window.localStorage.removeItem(ACTIVE_TEAM_KEY);
  } catch {
    /* ignore */
  }
}

export type RpcResult = { ok: true; message?: string } | { ok: false; error: string };

interface TeamContextValue {
  ready: boolean;
  teams: Team[];
  activeTeamId: string | null;
  activeTeam: Team | null;
  myRole: TeamRole | null;
  canEdit: boolean;
  canManage: boolean;
  switchTeam: (id: string) => void;
  createTeam: (name: string) => Promise<RpcResult>;
  renameTeam: (id: string, name: string) => Promise<RpcResult>;

  members: TeamMember[];
  membersLoading: boolean;
  refreshMembers: () => void;
  setMemberRole: (userId: string, role: TeamRole) => Promise<RpcResult>;
  removeMember: (userId: string) => Promise<RpcResult>;
  leaveTeam: (id: string) => Promise<RpcResult>;
  deleteTeam: (id: string) => Promise<RpcResult>;
  revokeInvite: (inviteId: string) => Promise<RpcResult>;

  invites: TeamInvite[];
  invitesLoading: boolean;
  refreshInvites: () => void;
  createInvite: (role: TeamRole) => Promise<{ ok: true; token: string } | { ok: false; error: string }>;

  pendingJoinToken: string | null;
  redeemInvite: (token: string) => Promise<RpcResult>;
  dismissPendingJoin: () => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

function friendlyRpcError(e: unknown): string {
  // Supabase hands back plain `{ message }` objects, not Error instances.
  const raw =
    e instanceof Error
      ? e.message
      : e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
        ? (e as { message: string }).message
        : '';
  if (!raw) return translate('core.team.somethingWrong');
  if (/failed to fetch|network/i.test(raw)) return translate('core.team.noConnection');
  if (/could not find the function/i.test(raw)) return translate('core.team.notAvailable');
  return raw.replace(/^(error|exception):\s*/i, '');
}

export function TeamProvider({ children }: { children: ReactNode }): JSX.Element {
  const supabase = useMemo(() => getSupabase(), []);
  const { user: authUser, ready: authReady } = useAuth();
  // A profile edit (avatar, consents) hands us a new user object for the same
  // account; everything here only cares which account it is.
  const authUserId = authUser?.id ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const user = useMemo(() => authUser, [authUserId]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [ready, setReady] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(() => readStoredTeam());

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const [pendingJoinToken, setPendingJoinToken] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('join');
    } catch {
      return null;
    }
  });

  const refreshTeams = useCallback(async (): Promise<Team[]> => {
    if (!supabase || !user) return [];
    const cacheKey = `kanz.teams.${user.id}`;
    // Offline (or a stalled link): fall back to the list we saw last time, so
    // the right team opens and your role still lets you edit.
    const fromCache = (): Team[] => {
      try {
        const raw = window.localStorage.getItem(cacheKey);
        const cached = raw ? (JSON.parse(raw) as Team[]) : [];
        if (Array.isArray(cached) && cached.length) setTeams(cached);
        return Array.isArray(cached) ? cached : [];
      } catch {
        return [];
      }
    };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return fromCache();
    const query = supabase.from('team_members').select('team_id, role, teams:team_id(id, name)').eq('user_id', user.id);
    const res = await Promise.race([
      query.then((r) => r),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
    ]).catch(() => null);
    if (!res || res.error || !res.data) return fromCache();
    const { data } = res;
    const list: Team[] = data
      .map((row) => {
        const t = row.teams as unknown as { id: string; name: string } | null;
        if (!t) return null;
        return { id: t.id, name: t.name, role: row.role as TeamRole };
      })
      .filter((t): t is Team => t !== null)
      .sort((a, b) => (a.name === 'Personal' ? -1 : b.name === 'Personal' ? 1 : a.name.localeCompare(b.name)));
    setTeams(list);
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(list));
    } catch {
      /* ignore */
    }
    return list;
  }, [supabase, user]);

  const switchTeam = useCallback((id: string) => {
    setActiveTeamId(id);
    writeStoredTeam(id);
  }, []);

  /* ── Load this user's teams, pick an active one ─────────────────────── */
  const bootstrapped = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady) return;
    if (!user || !supabase) {
      setTeams([]);
      setReady(true);
      return;
    }
    if (bootstrapped.current === user.id) return;
    bootstrapped.current = user.id;

    void (async () => {
      const list = await refreshTeams();
      const stored = readStoredTeam();
      const chosen = list.find((t) => t.id === stored) ?? list[0] ?? null;
      if (chosen) switchTeam(chosen.id);
      setReady(true);
    })();
  }, [authReady, user, supabase, refreshTeams, switchTeam]);

  useEffect(() => {
    if (!user || !supabase) return;
    const onOnline = (): void => void refreshTeams();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [user, supabase, refreshTeams]);

  /* ── Redeem a `?join=` link once signed in ──────────────────────────── */
  const redeemInvite = useCallback(
    async (token: string): Promise<RpcResult> => {
      if (!supabase || !user) return { ok: false, error: translate('core.team.signInFirst') };
      try {
        const { data, error } = await supabase.rpc('redeem_invite', { p_token: token });
        if (error) throw error;
        await refreshTeams();
        if (typeof data === 'string') switchTeam(data);
        setPendingJoinToken(null);
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('join');
          window.history.replaceState({}, '', url.toString());
        } catch {
          /* ignore */
        }
        return { ok: true, message: translate('core.team.joined') };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, user, refreshTeams, switchTeam],
  );

  const autoRedeemed = useRef(false);
  useEffect(() => {
    if (!ready || !user || !pendingJoinToken || autoRedeemed.current) return;
    autoRedeemed.current = true;
    void redeemInvite(pendingJoinToken);
  }, [ready, user, pendingJoinToken, redeemInvite]);

  const dismissPendingJoin = useCallback(() => {
    setPendingJoinToken(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Members + invites of the active team ───────────────────────────── */
  const refreshMembers = useCallback(() => {
    if (!supabase || !user || !activeTeamId) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, role, joined_at, profiles:user_id(username, email)')
        .eq('team_id', activeTeamId);
      if (!error && data) {
        setMembers(
          data.map((row) => {
            const p = row.profiles as unknown as { username: string | null; email: string | null } | null;
            return {
              userId: row.user_id as string,
              role: row.role as TeamRole,
              joinedAt: row.joined_at as string,
              username: p?.username ?? '',
              email: p?.email ?? '',
            };
          }),
        );
      }
      setMembersLoading(false);
    })();
  }, [supabase, user, activeTeamId]);

  const refreshInvites = useCallback(() => {
    if (!supabase || !user || !activeTeamId) {
      setInvites([]);
      return;
    }
    setInvitesLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('team_invites')
        .select('id, role, created_at, expires_at, max_uses, use_count')
        .eq('team_id', activeTeamId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setInvites(
          data.map((row) => ({
            id: row.id as string,
            role: row.role as TeamRole,
            createdAt: row.created_at as string,
            expiresAt: row.expires_at as string | null,
            maxUses: row.max_uses as number,
            useCount: row.use_count as number,
          })),
        );
      }
      setInvitesLoading(false);
    })();
  }, [supabase, user, activeTeamId]);

  useEffect(() => {
    refreshMembers();
    refreshInvites();
  }, [refreshMembers, refreshInvites]);

  /* ── RPC-backed mutations ────────────────────────────────────────────── */
  const createTeam = useCallback(
    async (name: string): Promise<RpcResult> => {
      if (!supabase) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { data, error } = await supabase.rpc('create_team', { team_name: name });
        if (error) throw error;
        await refreshTeams();
        if (typeof data === 'string') switchTeam(data);
        return { ok: true, message: translate('core.team.created') };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, refreshTeams, switchTeam],
  );

  const renameTeam = useCallback(
    async (id: string, name: string): Promise<RpcResult> => {
      if (!supabase) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { error } = await supabase.rpc('rename_team', { p_team_id: id, p_name: name });
        if (error) throw error;
        await refreshTeams();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, refreshTeams],
  );

  const createInvite = useCallback(
    async (role: TeamRole): Promise<{ ok: true; token: string } | { ok: false; error: string }> => {
      if (!supabase || !activeTeamId) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { data, error } = await supabase.rpc('create_invite', {
          p_team_id: activeTeamId,
          p_role: role,
          p_expires_hours: 168,
          p_max_uses: 0,
        });
        if (error) throw error;
        refreshInvites();
        return { ok: true, token: data as string };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, activeTeamId, refreshInvites],
  );

  const setMemberRole = useCallback(
    async (userId: string, role: TeamRole): Promise<RpcResult> => {
      if (!supabase || !activeTeamId) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { error } = await supabase.rpc('set_member_role', {
          p_team_id: activeTeamId,
          p_user_id: userId,
          p_role: role,
        });
        if (error) throw error;
        refreshMembers();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, activeTeamId, refreshMembers],
  );

  const removeMember = useCallback(
    async (userId: string): Promise<RpcResult> => {
      if (!supabase || !activeTeamId) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { error } = await supabase.rpc('remove_member', { p_team_id: activeTeamId, p_user_id: userId });
        if (error) throw error;
        refreshMembers();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, activeTeamId, refreshMembers],
  );

  const leaveTeam = useCallback(
    async (id: string): Promise<RpcResult> => {
      if (!supabase || !user) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { error } = await supabase.rpc('remove_member', { p_team_id: id, p_user_id: user.id });
        if (error) throw error;
        const list = await refreshTeams();
        const next = list[0] ?? null;
        if (next) switchTeam(next.id);
        else writeStoredTeam(null);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, user, refreshTeams, switchTeam],
  );

  const deleteTeam = useCallback(
    async (id: string): Promise<RpcResult> => {
      if (!supabase || !user) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { error } = await supabase.rpc('delete_team', { p_team_id: id });
        if (error) throw error;
        const list = await refreshTeams();
        const next = list.find((t) => t.id !== id) ?? null;
        if (next) switchTeam(next.id);
        else writeStoredTeam(null);
        return { ok: true, message: translate('core.team.deleted') };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, user, refreshTeams, switchTeam],
  );

  const revokeInvite = useCallback(
    async (inviteId: string): Promise<RpcResult> => {
      if (!supabase) return { ok: false, error: translate('core.notConfigured') };
      try {
        const { error } = await supabase.rpc('revoke_invite', { p_invite_id: inviteId });
        if (error) throw error;
        refreshInvites();
        return { ok: true, message: translate('core.team.inviteCancelled') };
      } catch (e) {
        return { ok: false, error: friendlyRpcError(e) };
      }
    },
    [supabase, refreshInvites],
  );

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;
  const myRole = activeTeam?.role ?? null;
  const canEdit = myRole === 'owner' || myRole === 'admin' || myRole === 'editor';
  const canManage = myRole === 'owner' || myRole === 'admin';

  const value = useMemo<TeamContextValue>(
    () => ({
      ready,
      teams,
      activeTeamId,
      activeTeam,
      myRole,
      canEdit,
      canManage,
      switchTeam,
      createTeam,
      renameTeam,
      members,
      membersLoading,
      refreshMembers,
      setMemberRole,
      removeMember,
      leaveTeam,
      deleteTeam,
      revokeInvite,
      invites,
      invitesLoading,
      refreshInvites,
      createInvite,
      pendingJoinToken,
      redeemInvite,
      dismissPendingJoin,
    }),
    [
      ready,
      teams,
      activeTeamId,
      activeTeam,
      myRole,
      canEdit,
      canManage,
      switchTeam,
      createTeam,
      renameTeam,
      members,
      membersLoading,
      refreshMembers,
      setMemberRole,
      removeMember,
      leaveTeam,
      deleteTeam,
      revokeInvite,
      invites,
      invitesLoading,
      refreshInvites,
      createInvite,
      pendingJoinToken,
      redeemInvite,
      dismissPendingJoin,
    ],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used inside <TeamProvider>');
  return ctx;
}

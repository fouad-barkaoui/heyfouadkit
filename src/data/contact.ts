import { getSupabase } from './supabaseClient';

/**
 * Contact page inbox (table `contact_messages`, see
 * supabase/migrations/20260929_contact_messages.sql). Anyone can send;
 * only the admin account can read, triage or delete — enforced by RLS, not
 * by this file.
 */

export type ContactTopic = 'feedback' | 'bug' | 'idea' | 'collab' | 'other';
export type ContactStatus = 'new' | 'read' | 'archived';

export interface ContactDraft {
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
}

export interface ContactMessage extends ContactDraft {
  id: string;
  createdAt: string;
  status: ContactStatus;
  page: string | null;
}

export const CONTACT_LIMITS = { name: 120, email: 320, subject: 160, message: 5000 } as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Field-level problems, keyed by field — empty object means it's sendable. */
export function validateContact(d: ContactDraft): Partial<Record<keyof ContactDraft, string>> {
  const errors: Partial<Record<keyof ContactDraft, string>> = {};
  if (!d.name.trim()) errors.name = 'Tell me your name';
  else if (d.name.length > CONTACT_LIMITS.name) errors.name = 'That name is too long';
  if (!EMAIL_RE.test(d.email.trim())) errors.email = 'Enter a valid email so I can reply';
  if (!d.subject.trim()) errors.subject = 'Add a short subject';
  else if (d.subject.length > CONTACT_LIMITS.subject) errors.subject = 'Keep the subject under 160 characters';
  if (d.message.trim().length < 10) errors.message = 'Write at least a sentence (10+ characters)';
  else if (d.message.length > CONTACT_LIMITS.message) errors.message = 'Messages are capped at 5,000 characters';
  return errors;
}

function friendly(message: string): string {
  if (/too many messages/i.test(message)) return 'You sent a few messages just now — please wait a few minutes.';
  if (/failed to fetch|network|load failed/i.test(message)) return "You're offline — your message is kept here, send it when you're back online.";
  return 'The message could not be sent. Please try again in a moment.';
}

export async function sendContactMessage(d: ContactDraft): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('This copy of the app is not connected to the cloud, so it cannot send messages.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error("You're offline — your message is kept here, send it when you're back online.");
  }
  const { data } = await sb.auth.getSession();
  // No `.select()` after insert: senders can't read the table back (RLS),
  // so asking for the inserted row would fail the whole request.
  const { error } = await sb.from('contact_messages').insert({
    name: d.name.trim(),
    email: d.email.trim(),
    topic: d.topic,
    subject: d.subject.trim(),
    message: d.message.trim(),
    user_id: data.session?.user.id ?? null,
    page: typeof window !== 'undefined' ? window.location.pathname + window.location.hash : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null,
  });
  if (error) throw new Error(friendly(error.message));
}

interface Row {
  id: string;
  created_at: string;
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  status: ContactStatus;
  page: string | null;
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('contact_messages')
    .select('id, created_at, name, email, topic, subject, message, status, page')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(friendly(error.message));
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    email: r.email,
    topic: r.topic,
    subject: r.subject,
    message: r.message,
    status: r.status,
    page: r.page,
  }));
}

export async function setContactStatus(id: string, status: ContactStatus): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('contact_messages').update({ status }).eq('id', id);
  if (error) throw new Error(friendly(error.message));
}

export async function deleteContactMessage(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('contact_messages').delete().eq('id', id);
  if (error) throw new Error(friendly(error.message));
}

/** Fired (on window) whenever the admin triages messages, so the bell can re-check. */
export const CONTACT_CHANGED_EVENT = 'kanz:contact-changed';
export function announceContactChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONTACT_CHANGED_EVENT));
}

/** Only the messages nobody has opened yet — what the admin bell shows. Admin-only (RLS). */
export async function listNewContactMessages(): Promise<ContactMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('contact_messages')
    .select('id, created_at, name, email, topic, subject, message, status, page')
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    email: r.email,
    topic: r.topic,
    subject: r.subject,
    message: r.message,
    status: r.status,
    page: r.page,
  }));
}

/** Live pings for new messages (Supabase realtime). Returns an unsubscribe. */
export function watchContactInserts(onInsert: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => undefined;
  const channel = sb
    .channel('contact-inserts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, onInsert)
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}

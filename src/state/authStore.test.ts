import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { getAvatarUrl, getDisplayName } from './authStore';

function makeUser(over: { email?: string | null; username?: string }): User {
  return {
    id: 'u1',
    email: 'email' in over ? over.email : 'fouad@example.com',
    user_metadata: over.username ? { username: over.username } : {},
  } as unknown as User;
}

describe('getDisplayName', () => {
  it('is empty for a signed-out visitor', () => {
    expect(getDisplayName(null)).toBe('');
  });

  it('prefers the chosen username over the email', () => {
    expect(getDisplayName(makeUser({ email: 'fouad@example.com', username: 'Fouad' }))).toBe('Fouad');
  });

  it('trims a username with stray whitespace', () => {
    expect(getDisplayName(makeUser({ username: '  Fouad  ' }))).toBe('Fouad');
  });

  it('falls back to the part of the email before the @ when no username is set', () => {
    expect(getDisplayName(makeUser({ email: 'lmorfouad3@gmail.com' }))).toBe('lmorfouad3');
  });

  it('falls back to a generic greeting when there is no email either', () => {
    expect(getDisplayName(makeUser({ email: null }))).toBe('there');
  });

  it('uses the Google account name when no username was chosen', () => {
    const user = { id: 'u2', email: 'a@b.co', user_metadata: { full_name: 'Fouad Barkaoui', name: 'Fouad' } } as unknown as User;
    expect(getDisplayName(user)).toBe('Fouad Barkaoui');
  });
});

describe('getAvatarUrl', () => {
  const withMeta = (meta: Record<string, unknown>): User => ({ id: 'u3', user_metadata: meta }) as unknown as User;

  it('prefers a picture the person uploaded over the Google photo', () => {
    expect(getAvatarUrl(withMeta({ avatar_custom: 'https://x/mine.webp', avatar_url: 'https://lh3/google.jpg' }))).toBe(
      'https://x/mine.webp',
    );
  });

  it('respects an explicit removal even when Google sends a photo', () => {
    expect(getAvatarUrl(withMeta({ avatar_custom: '', avatar_url: 'https://lh3/google.jpg' }))).toBeNull();
  });

  it('falls back to the Google photo', () => {
    expect(getAvatarUrl(withMeta({ avatar_url: 'https://lh3/google.jpg' }))).toBe('https://lh3/google.jpg');
    expect(getAvatarUrl(withMeta({ picture: 'https://lh3/pic.jpg' }))).toBe('https://lh3/pic.jpg');
  });
});

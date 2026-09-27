import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { getDisplayName } from './authStore';

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
});

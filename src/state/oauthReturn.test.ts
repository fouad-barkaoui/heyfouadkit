import { afterEach, describe, expect, it } from 'vitest';
import { friendlyOAuthError, parseOAuthRedirectError, rememberReturnRoute, takeReturnRoute } from './oauthReturn';

describe('parseOAuthRedirectError', () => {
  it('ignores a normal address', () => {
    expect(parseOAuthRedirectError('https://kanz-workspace.vercel.app/#/saveit')).toBeNull();
  });

  it('ignores a successful sign-in hash', () => {
    expect(parseOAuthRedirectError('https://kanz-workspace.vercel.app/#access_token=a&refresh_token=b')).toBeNull();
  });

  it('reads a cancelled Google sign-in from the hash and cleans it out', () => {
    const r = parseOAuthRedirectError(
      'https://kanz-workspace.vercel.app/#error=access_denied&error_code=access_denied&error_description=The+user+denied+access',
    );
    expect(r?.message).toMatch(/cancelled/);
    expect(r?.cleanedUrl).toBe('/');
  });

  it('reads an error from the query and keeps unrelated parameters', () => {
    const r = parseOAuthRedirectError(
      'https://kanz-workspace.vercel.app/?ref=x&error=server_error&error_description=Database+error+saving+new+user',
    );
    expect(r?.message).toMatch(/could not be set up/);
    expect(r?.cleanedUrl).toBe('/?ref=x');
  });
});

describe('friendlyOAuthError', () => {
  it('explains a provider that is switched off', () => {
    expect(friendlyOAuthError('validation_failed', 'Unsupported provider: provider is not enabled')).toMatch(/not switched on/);
  });

  it('falls back to the raw description', () => {
    expect(friendlyOAuthError('weird', 'Something odd')).toBe('Google sign-in did not finish: Something odd');
  });
});

describe('return route', () => {
  afterEach(() => sessionStorage.clear());

  it('round-trips an in-app route once', () => {
    rememberReturnRoute('#/saveit');
    expect(takeReturnRoute()).toBe('#/saveit');
    expect(takeReturnRoute()).toBeNull();
  });

  it('drops a stale route', () => {
    rememberReturnRoute('#/habits');
    expect(takeReturnRoute(Date.now() + 16 * 60 * 1000)).toBeNull();
  });

  it('refuses anything that is not an in-app route', () => {
    rememberReturnRoute('#access_token=abc');
    expect(takeReturnRoute()).toBeNull();
  });
});

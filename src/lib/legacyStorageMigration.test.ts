import { beforeEach, describe, expect, it } from 'vitest';
import { migrateStorage } from './legacyStorageMigration';

describe('migrateStorage', () => {
  beforeEach(() => localStorage.clear());

  it('moves a heyfouad.* value to kanz.* and removes the old key', () => {
    localStorage.setItem('heyfouad.auth', '{"session":1}');
    migrateStorage(localStorage);
    expect(localStorage.getItem('kanz.auth')).toBe('{"session":1}');
    expect(localStorage.getItem('heyfouad.auth')).toBeNull();
  });

  it('carries the oldest nexus.* keys across too', () => {
    localStorage.setItem('nexus.theme.v1', 'light');
    migrateStorage(localStorage);
    expect(localStorage.getItem('kanz.theme.v1')).toBe('light');
    expect(localStorage.getItem('nexus.theme.v1')).toBeNull();
  });

  it('prefers the newer heyfouad.* value over an old nexus.* one', () => {
    localStorage.setItem('nexus.language.v1', 'fr');
    localStorage.setItem('heyfouad.language.v1', 'ar');
    migrateStorage(localStorage);
    expect(localStorage.getItem('kanz.language.v1')).toBe('ar');
  });

  it('never overwrites a value already saved under the new name', () => {
    localStorage.setItem('kanz.theme.v1', 'dark');
    localStorage.setItem('heyfouad.theme.v1', 'light');
    migrateStorage(localStorage);
    expect(localStorage.getItem('kanz.theme.v1')).toBe('dark');
  });

  it('keeps keys with a dynamic suffix intact', () => {
    localStorage.setItem('heyfouad.cloudTerms.user-1', '1');
    migrateStorage(localStorage);
    expect(localStorage.getItem('kanz.cloudTerms.user-1')).toBe('1');
  });

  it('leaves unrelated keys alone and is safe to run twice', () => {
    localStorage.setItem('other.thing', 'x');
    localStorage.setItem('heyfouad.theme.v1', 'dark');
    migrateStorage(localStorage);
    migrateStorage(localStorage);
    expect(localStorage.getItem('other.thing')).toBe('x');
    expect(localStorage.getItem('kanz.theme.v1')).toBe('dark');
  });
});

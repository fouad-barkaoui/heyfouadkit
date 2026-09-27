/**
 * The onboarding flow (welcome popup → cloud-terms popup) is driven by two
 * small, best-effort flags rather than global state: whether this tab just
 * completed an explicit sign-in/sign-up, and whether this account has ever
 * accepted the cloud terms on this device. Neither is fatal to lose.
 */

/** Set by AccountPanel right after a successful sign-in/sign-up, read once by OnboardingFlow. */
export const JUST_AUTHED_KEY = 'heyfouad.justAuthed.v1';

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* private mode / quota — the flow just runs again next time */
  }
}

/** True once, right after a successful sign-in/sign-up in this tab — then it clears itself. */
export function consumeJustAuthedFlag(): boolean {
  const flagged = safeGet(sessionStorage, JUST_AUTHED_KEY) === '1';
  if (flagged) {
    try {
      sessionStorage.removeItem(JUST_AUTHED_KEY);
    } catch {
      /* ignore */
    }
  }
  return flagged;
}

function termsKey(userId: string): string {
  return `heyfouad.cloudTerms.${userId}`;
}

export function hasAcceptedCloudTerms(userId: string): boolean {
  return safeGet(localStorage, termsKey(userId)) === '1';
}

export function acceptCloudTerms(userId: string): void {
  safeSet(localStorage, termsKey(userId), '1');
}

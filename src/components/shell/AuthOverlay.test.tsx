import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleStatus } from '@/state/authStore';

const auth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  sendReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  googleStatus: 'on' as GoogleStatus,
  oauthError: null as string | null,
  clearOAuthError: vi.fn(),
};

vi.mock('@/state/authStore', () => ({ useAuth: () => auth }));

const { AuthOverlay } = await import('./AuthOverlay');

describe('AuthOverlay', () => {
  beforeEach(() => {
    auth.googleStatus = 'on';
    auth.oauthError = null;
    auth.signInWithGoogle.mockReset();
    auth.clearOAuthError.mockReset();
  });

  it('offers Google first when the provider is switched on', async () => {
    auth.signInWithGoogle.mockResolvedValue({ ok: true });
    render(<AuthOverlay open onOpenChange={() => {}} />);
    const google = screen.getByRole('button', { name: /continue with google/i });
    await userEvent.click(google);
    expect(auth.signInWithGoogle).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /opening google/i })).toBeDisabled();
  });

  it('hides Google while the provider is off', () => {
    auth.googleStatus = 'off';
    render(<AuthOverlay open onOpenChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /continue with google/i })).toBeNull();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows why Google failed and re-enables the button', async () => {
    auth.signInWithGoogle.mockResolvedValue({ ok: false, error: 'You are offline.' });
    render(<AuthOverlay open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You are offline.');
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeEnabled();
  });

  it('reopens with the reason after a failed Google round-trip', () => {
    auth.oauthError = 'Google sign-in was cancelled.';
    const onOpenChange = vi.fn();
    const { rerender } = render(<AuthOverlay open={false} onOpenChange={onOpenChange} />);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(auth.clearOAuthError).toHaveBeenCalled();
    auth.oauthError = null;
    rerender(<AuthOverlay open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in was cancelled.');
  });

  it('keeps Google out of the password reset screen', async () => {
    render(<AuthOverlay open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Forgot?' }));
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue with google/i })).toBeNull();
  });
});

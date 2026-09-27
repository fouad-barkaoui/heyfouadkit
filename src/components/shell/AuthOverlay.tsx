import { Eye, EyeOff, Lock, Loader2, Mail, type LucideIcon, Sparkles, User, X } from 'lucide-react';
import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { JUST_AUTHED_KEY } from '@/state/onboarding';

type Mode = 'signin' | 'signup' | 'reset';

const INSTAGRAM_URL = 'https://www.instagram.com/heyfouad/';

function DarkField({
  label,
  icon: Icon,
  trailing,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; icon: LucideIcon; trailing?: ReactNode }): JSX.Element {
  return (
    <div>
      <label htmlFor={rest.id} className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-[#7a7a80]">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2.5 transition-colors duration-150 focus-within:border-[#e4f222]/50 focus-within:bg-white/[0.06]">
        <Icon size={15} strokeWidth={1.8} className="shrink-0 text-[#7a7a80]" aria-hidden />
        <input
          {...rest}
          className="w-full min-w-0 bg-transparent text-[13.5px] text-white placeholder:text-[#5c5c62] focus:outline-none focus-visible:shadow-none"
        />
        {trailing}
      </div>
    </div>
  );
}

/**
 * The full sign-in / sign-up experience — a single dark glass card centred
 * on a near-black backdrop, mounted only while signed out of a configured
 * cloud project (see AppShell). Styled as its own hardcoded-hex on-ramp
 * surface, independent of the app's dark/light theme system, matching the
 * app's acid-lime brand accent rather than the app's regular theme tokens.
 */
export function AuthOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element | null {
  const { signIn, signUp, sendReset } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    if (open) return;
    setMode('signin');
    setPassword('');
    setFullName('');
    setAgreed(false);
    setShowPassword(false);
    setFeedback(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const switchMode = (next: Mode): void => {
    setMode(next);
    setFeedback(null);
    if (next !== 'signup') setAgreed(false);
  };

  const submit = async (): Promise<void> => {
    setBusy(true);
    setFeedback(null);
    const result =
      mode === 'reset' ? await sendReset(email) : mode === 'signup' ? await signUp(email, password, fullName) : await signIn(email, password);
    setBusy(false);
    if (result.ok) {
      const loggedIn = mode === 'signin' || (mode === 'signup' && result.signedIn);
      if (loggedIn) {
        try {
          sessionStorage.setItem(JUST_AUTHED_KEY, '1');
        } catch {
          /* private mode — the welcome popup just won't appear this once */
        }
      }
      setFeedback({ tone: 'ok', text: result.message ?? 'Signed in.' });
      setPassword('');
      if (loggedIn) window.setTimeout(() => onOpenChange(false), 700);
    } else {
      setFeedback({ tone: 'bad', text: result.error });
    }
  };

  const heading = mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back';
  const subtitle =
    mode === 'signup'
      ? "Let's get started, it's free."
      : mode === 'reset'
        ? "We'll email you a reset link."
        : 'Sign in to continue.';

  const disabled = busy || !email || (mode === 'signup' && (fullName.trim().length < 2 || !agreed));

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#050506] p-4">
      <div
        className="absolute inset-0 [background:radial-gradient(circle_at_50%_0%,rgba(228,242,34,0.09),transparent_60%)] animate-[nx-fade_180ms_var(--ease-out-quint)_both]"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative w-full max-w-[400px] animate-[nx-scale-in_240ms_var(--ease-out-quint)_both]">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Continue browsing"
          className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#1a1b1e] text-[#b3b3b8] shadow-[0_4px_14px_rgba(0,0,0,0.4)] transition-colors hover:text-white"
        >
          <X size={15} strokeWidth={1.9} />
        </button>

        <div className="relative overflow-visible rounded-[20px] bg-[#111214] px-7 pb-7 pt-10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),0_24px_70px_rgba(0,0,0,0.6)]">
          <span className="absolute -top-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[#e4f222] to-[#9db300] shadow-[0_10px_26px_rgba(228,242,34,0.32),0_0_0_5px_#111214]">
            <Sparkles size={22} strokeWidth={2} className="text-[#0a0a0a]" aria-hidden />
          </span>

          <div className="text-center">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#7a7a80]">Barkaoui's Kit</p>
            <h1 className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-white">{heading}</h1>
            <p className="mt-1 text-[13px] text-[#9a9aa0]">{subtitle}</p>
          </div>

          <div className="mt-6 space-y-3.5">
            {mode === 'signup' ? (
              <DarkField
                id="auth-fullname"
                label="Full Name"
                icon={User}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="What should we call you?"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />
            ) : null}

            <DarkField
              id="auth-email"
              label="Email Address"
              icon={Mail}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
            />

            {mode !== 'reset' ? (
              <DarkField
                id="auth-password"
                label="Password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="shrink-0 text-[#7a7a80] transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                  </button>
                }
              />
            ) : null}
          </div>

          {mode === 'signup' ? (
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[8px] bg-white/[0.03] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-[2px] h-[15px] w-[15px] accent-[#e4f222]"
              />
              <span className="text-[12px] leading-[1.55] text-[#b3b3b8]">
                I agree to the terms of service and privacy policy.
              </span>
            </label>
          ) : null}

          {feedback ? (
            <p
              className={cn(
                'mt-4 rounded-[8px] px-3 py-2 text-[12.5px] leading-[1.5]',
                feedback.tone === 'bad' ? 'bg-[#3a1414] text-[#ff8a80]' : 'bg-[#123a26] text-[#7fe0ab]',
              )}
            >
              {feedback.text}
            </p>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            onClick={() => void submit()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#e4f222] to-[#9db300] py-2.5 text-[13.5px] font-semibold text-[#0a0a0a] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === 'reset' ? 'Send reset link' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <p className="mt-5 text-center text-[12.5px] text-[#9a9aa0]">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')} className="font-medium text-white underline underline-offset-2">
                  Sign in
                </button>
              </>
            ) : mode === 'reset' ? (
              <button type="button" onClick={() => switchMode('signin')} className="font-medium text-white underline underline-offset-2">
                Back to sign in
              </button>
            ) : (
              <>
                Don't have an account?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-medium text-white underline underline-offset-2">
                  Create one
                </button>
              </>
            )}
          </p>

          {mode === 'signin' ? (
            <p className="mt-2 text-center">
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-[12px] text-[#7a7a80] transition-colors hover:text-white"
              >
                Forgot your password?
              </button>
            </p>
          ) : null}

          <p className="mt-5 text-center">
            <button type="button" onClick={() => onOpenChange(false)} className="text-[11px] text-[#5c5c62] underline underline-offset-2 hover:text-[#9a9aa0]">
              Keep browsing without an account
            </button>
          </p>

          <p className="mt-5 border-t border-white/[0.07] pt-4 text-center text-[11px] leading-[1.5] text-[#5c5c62]">
            Questions?{' '}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-[#e4f222] underline underline-offset-2">
              Message @heyfouad
            </a>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

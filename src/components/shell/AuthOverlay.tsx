import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BrandMark } from '@/components/ui/BrandMark';
import { KanzWordmark } from '@/components/ui/KanzWordmark';
import { useI18n } from '@/components/ui/useI18n';
import { cn } from '@/lib/utils';
import { useAuth } from '@/state/authStore';

type Mode = 'signin' | 'signup' | 'reset';

function GoogleMark(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/** A sparse field of slow-drifting dots behind the form. Stops when hidden. */
function Particles(): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      a: 0.15 + Math.random() * 0.45,
    }));
    let frame = 0;
    const draw = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = getComputedStyle(canvas).color;
      for (const d of dots) {
        d.x = (d.x + d.vx + 1) % 1;
        d.y = (d.y + d.vy + 1) % 1;
        ctx.globalAlpha = d.a;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resume = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    resume();
    window.addEventListener('resize', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-paper" />;
}

function AuthField({
  label,
  aside,
  trailing,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; aside?: ReactNode; trailing?: ReactNode }): JSX.Element {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={rest.id} className="text-[13px] font-medium text-mist">
          {label}
        </label>
        {aside}
      </div>
      <div className="auth-input">
        <input {...rest} />
        {trailing}
      </div>
    </div>
  );
}

/**
 * The sign-in / sign-up screen, mounted while signed out of a configured
 * cloud project (see AppShell). One centred column on every screen size:
 * Google first when the project has it switched on, email and password below.
 */
export function AuthOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element | null {
  const { signIn, signUp, sendReset, signInWithGoogle, googleStatus, oauthError, clearOAuthError } = useAuth();
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    if (open) return;
    setMode('signin');
    setPassword('');
    setFullName('');
    setAgreed(false);
    setShowPassword(false);
    setFeedback(null);
    setGoogleBusy(false);
  }, [open]);

  // Came back from a Google attempt that failed: reopen here and say why.
  useEffect(() => {
    if (!oauthError) return;
    setMode('signin');
    setFeedback({ tone: 'bad', text: oauthError });
    clearOAuthError();
    onOpenChange(true);
  }, [oauthError, clearOAuthError, onOpenChange]);

  // Pressing Back on Google's page can restore this page from the browser's
  // cache with the button still spinning; reset it.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent): void => {
      if (e.persisted) setGoogleBusy(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

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
      setFeedback({ tone: 'ok', text: result.message ?? t('sh.auth.signedIn') });
      setPassword('');
      if (loggedIn) window.setTimeout(() => onOpenChange(false), 700);
    } else {
      setFeedback({ tone: 'bad', text: result.error });
    }
  };

  const continueWithGoogle = async (): Promise<void> => {
    setGoogleBusy(true);
    setFeedback(null);
    const result = await signInWithGoogle();
    // On success the browser is already on its way to Google; only a local
    // failure (offline, provider off) comes back here.
    if (!result.ok) {
      setGoogleBusy(false);
      setFeedback({ tone: 'bad', text: result.error });
    }
  };

  const heading =
    mode === 'signup' ? t('sh.auth.signupTitle') : mode === 'reset' ? t('sh.auth.resetTitle') : t('sh.auth.signinTitle');
  const subtitle =
    mode === 'signup' ? t('sh.auth.signupHint') : mode === 'reset' ? t('sh.auth.resetHint') : t('sh.auth.signinHint');

  const showGoogle = mode !== 'reset' && (googleStatus === 'on' || googleStatus === 'unknown');
  const disabled = busy || googleBusy || !email || (mode === 'signup' && (fullName.trim().length < 2 || !agreed));
  const onEnter = (e: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !disabled) void submit();
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="auth-heading" className="auth-screen">
      <Particles />
      <button type="button" onClick={() => onOpenChange(false)} className="auth-home">
        <ChevronLeft size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
        {t('nav.home')}
      </button>

      <div className="auth-card">
        <div className="mb-5 flex items-center gap-2.5">
          <BrandMark size={26} />
          <KanzWordmark height={15} className="text-paper" />
        </div>

        {mode === 'reset' ? (
          <button type="button" onClick={() => switchMode('signin')} className="auth-link mb-3 inline-flex items-center gap-1">
            <ChevronLeft size={14} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
            {t('sh.auth.backToSignIn')}
          </button>
        ) : null}

        <h1 id="auth-heading" className="text-[22px] font-semibold tracking-[-0.02em] text-paper">
          {heading}
        </h1>
        <p className="mt-1 text-[14px] text-fog">{subtitle}</p>

        {googleStatus === 'unknown' ? (
          <p role="status" className="auth-note mt-4" data-tone="warn">
            {t('sh.auth.cloudUnreachable')}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {showGoogle ? (
            <>
              <button
                type="button"
                disabled={googleBusy || busy}
                onClick={() => void continueWithGoogle()}
                className="auth-btn"
                data-variant="solid"
              >
                {googleBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <GoogleMark />}
                {googleBusy ? t('sh.auth.openingGoogle') : t('sh.auth.continueGoogle')}
              </button>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-graphite" />
                <span className="text-[12px] text-ash">{t('sh.auth.orEmail')}</span>
                <div className="h-px flex-1 bg-graphite" />
              </div>
            </>
          ) : null}

          {mode === 'signup' ? (
            <AuthField
              id="auth-fullname"
              label={t('sh.auth.fullName')}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('sh.auth.fullNamePlaceholder')}
              onKeyDown={onEnter}
            />
          ) : null}
          <AuthField
            id="auth-email"
            label={t('sh.auth.email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            onKeyDown={onEnter}
          />
          {mode !== 'reset' ? (
            <AuthField
              id="auth-password"
              label={t('sh.auth.password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? t('sh.auth.pwMin') : t('sh.auth.pwYours')}
              onKeyDown={onEnter}
              aside={
                mode === 'signin' ? (
                  <button type="button" onClick={() => switchMode('reset')} className="auth-link">
                    {t('sh.auth.forgot')}
                  </button>
                ) : null
              }
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('sh.auth.hidePassword') : t('sh.auth.showPassword')}
                  className="shrink-0 text-ash transition-colors hover:text-paper"
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              }
            />
          ) : null}

          {mode === 'signup' ? (
            <label className="flex cursor-pointer items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-[3px] h-[14px] w-[14px] accent-[var(--color-acid)]"
              />
              <span className="text-[12.5px] leading-[1.55] text-fog">{t('sh.auth.agree')}</span>
            </label>
          ) : null}

          {feedback ? (
            <p role={feedback.tone === 'bad' ? 'alert' : 'status'} className="auth-note" data-tone={feedback.tone}>
              {feedback.text}
            </p>
          ) : null}

          <button type="button" disabled={disabled} onClick={() => void submit()} className="auth-btn">
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
            {mode === 'reset' ? t('sh.auth.sendReset') : mode === 'signup' ? t('sh.auth.createAccount') : t('shell.signIn')}
          </button>
        </div>

        {mode !== 'reset' ? (
          <p className="mt-5 text-[13px] text-fog">
            {mode === 'signup' ? t('sh.auth.haveAccount') : t('sh.auth.noAccount')}{' '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
              className={cn('auth-link', 'text-paper')}
            >
              {mode === 'signup' ? t('shell.signIn') : t('sh.auth.createOne')}
            </button>
          </p>
        ) : null}

        <p className="mt-6 text-[12.5px] leading-[1.6] text-ash">{t('sh.auth.legal')}</p>
      </div>
    </div>,
    document.body,
  );
}

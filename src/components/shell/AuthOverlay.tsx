import { ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, Mail, type LucideIcon, User, X } from 'lucide-react';
import { MARK_SRC } from '@/components/ui/BrandMark';
import { KanzWordmark } from '@/components/ui/KanzWordmark';
import { useI18n } from '@/components/ui/useI18n';
import { useEffect, useState, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { JUST_AUTHED_KEY } from '@/state/onboarding';

type Mode = 'signin' | 'signup' | 'reset';

const INSTAGRAM_URL = 'https://www.instagram.com/heyfouad/';

/** What the left panel promises: the app's real modules, in its own words (translation keys). */
const FEATURES = ['sh.auth.feature1', 'sh.auth.feature2', 'sh.auth.feature3', 'sh.auth.feature4'] as const;

function GoogleMark(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function DarkField({
  label,
  icon: Icon,
  trailing,
  aside,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  trailing?: ReactNode;
  /** Shown at the right end of the label row (e.g. "Forgot?"). */
  aside?: ReactNode;
}): JSX.Element {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={rest.id} className="text-[12.5px] font-medium text-[#9aa1b2]">
          {label}
        </label>
        {aside}
      </div>
      <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.035] px-3 py-2.5 transition-colors duration-150 focus-within:border-[#e4f222]/55 focus-within:bg-white/[0.06]">
        <Icon size={15} strokeWidth={1.8} className="shrink-0 text-[#6c7385]" aria-hidden />
        <input
          {...rest}
          className="w-full min-w-0 bg-transparent text-[14px] text-white placeholder:text-[#4f5566] focus:outline-none focus-visible:shadow-none"
        />
        {trailing}
      </div>
    </div>
  );
}

/**
 * The sign-in / sign-up screen, mounted while signed out of a configured
 * cloud project (see AppShell). Full screen: on wide screens a product panel
 * on the left and the form on the right; on phones just the form.
 *
 * Google comes first when the project has it switched on (authStore asks
 * Supabase on startup), email and password below. Styled with its own fixed
 * colours, independent of the app's light/dark theme, around the app's
 * acid-lime accent.
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
      if (loggedIn) {
        try {
          sessionStorage.setItem(JUST_AUTHED_KEY, '1');
        } catch {
          /* private mode — the welcome popup just won't appear this once */
        }
      }
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-heading"
      className="fixed inset-0 z-[70] flex items-start overflow-y-auto bg-[#06070b] animate-[nx-fade_200ms_var(--ease-out-quint)_both]"
    >
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label={t('sh.auth.closeKeepBrowsing')}
        className="fixed right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#12151d] text-[#9aa1b2] transition-colors hover:text-white"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <X size={16} strokeWidth={1.9} />
      </button>

      {/* ── Product panel (wide screens) ─────────────────────────────── */}
      <aside className="relative hidden min-h-full w-1/2 shrink-0 flex-col justify-between overflow-hidden border-r border-white/[0.06] p-14 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.075)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(180deg,#000_30%,transparent_95%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full [background:radial-gradient(circle,rgba(228,242,34,0.10),transparent_65%)]"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-[#0b0c10] shadow-[0_0_0_1px_rgba(228,242,34,0.45)]">
            <img src={MARK_SRC} alt="" width={36} height={36} className="h-full w-full object-cover" aria-hidden />
          </span>
          <KanzWordmark height={20} gem="#e4f222" className="text-white" />
          <span lang="ar" dir="rtl" className="text-[17px] leading-none text-[#4f5566]" title={t('sh.auth.kanzMeaning')}>
            كنز
          </span>
        </div>

        <div className="relative flex max-w-[460px] flex-col gap-7">
          <p className="text-[40px] font-bold leading-[1.15] tracking-[-0.02em] text-white [text-wrap:balance]">
            {t('sh.auth.tagline')}
          </p>
          <p className="max-w-[38ch] text-[15px] leading-[1.65] text-[#9aa1b2]">
            {t('sh.auth.pitch')}
          </p>
          <ul className="flex flex-col gap-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[14px] text-[#dde2ec]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#e4f222]/50 text-[#e4f222]">
                  <Check size={12} strokeWidth={2.6} aria-hidden />
                </span>
                {t(f)}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] tracking-[0.02em] text-[#4f5566]">
          <span>{t('sh.auth.rls')}</span>
          <span>{t('sh.auth.encrypted')}</span>
          <span>{t('sh.auth.offline')}</span>
        </p>
      </aside>

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <section className="flex min-h-full flex-1 justify-center px-4 pb-12 pt-16 sm:px-8 sm:py-16">
        <div className="my-auto w-full max-w-[380px]">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#0b0c10] shadow-[0_8px_24px_rgba(228,242,34,0.22),0_0_0_3px_#e4f222,0_0_0_6px_#06070b]">
              <img src={MARK_SRC} alt="" width={56} height={56} className="h-full w-full object-cover" aria-hidden />
            </span>
            <KanzWordmark height={17} gem="#e4f222" className="text-white" />
          </div>

          {mode !== 'reset' ? (
            <div className="mb-7 flex gap-1 rounded-[11px] border border-white/[0.07] bg-white/[0.025] p-1">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition-colors duration-150',
                    mode === m ? 'bg-[#1a1e29] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]' : 'text-[#6c7385] hover:text-[#b7bdcb]',
                  )}
                >
                  {m === 'signin' ? t('shell.signIn') : t('sh.auth.createAccount')}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="mb-7 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#9aa1b2] transition-colors hover:text-white"
            >
              <ArrowLeft size={14} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
              {t('sh.auth.backToSignIn')}
            </button>
          )}

          <h1 id="auth-heading" className="text-[23px] font-bold tracking-[-0.02em] text-white">
            {heading}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[#9aa1b2]">{subtitle}</p>

          {showGoogle ? (
            <>
              <button
                type="button"
                disabled={googleBusy || busy}
                onClick={() => void continueWithGoogle()}
                className="mt-7 flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[10px] bg-white text-[14px] font-semibold text-[#1f1f1f] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_22px_-10px_rgba(0,0,0,0.6)] transition-[background-color,opacity] duration-150 hover:bg-[#f1f2f4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleBusy ? <Loader2 size={17} className="animate-spin text-[#5f6368]" aria-hidden /> : <GoogleMark />}
                {googleBusy ? t('sh.auth.openingGoogle') : t('sh.auth.continueGoogle')}
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#4f5566]">{t('sh.auth.orEmail')}</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
            </>
          ) : (
            <div className="h-7" />
          )}

          <div className="space-y-4">
            {mode === 'signup' ? (
              <DarkField
                id="auth-fullname"
                label={t('sh.auth.fullName')}
                icon={User}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('sh.auth.fullNamePlaceholder')}
                onKeyDown={onEnter}
              />
            ) : null}

            <DarkField
              id="auth-email"
              label={t('sh.auth.email')}
              icon={Mail}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={onEnter}
            />

            {mode !== 'reset' ? (
              <DarkField
                id="auth-password"
                label={t('sh.auth.password')}
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? t('sh.auth.pwMin') : t('sh.auth.pwYours')}
                onKeyDown={onEnter}
                aside={
                  mode === 'signin' ? (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-[12px] font-medium text-[#e4f222] transition-opacity hover:opacity-80"
                    >
                      {t('sh.auth.forgot')}
                    </button>
                  ) : null
                }
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('sh.auth.hidePassword') : t('sh.auth.showPassword')}
                    className="shrink-0 text-[#6c7385] transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                  </button>
                }
              />
            ) : null}
          </div>

          {mode === 'signup' ? (
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[9px] bg-white/[0.025] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-[2px] h-[15px] w-[15px] accent-[#e4f222]"
              />
              <span className="text-[12px] leading-[1.55] text-[#b7bdcb]">{t('sh.auth.agree')}</span>
            </label>
          ) : null}

          {feedback ? (
            <p
              role={feedback.tone === 'bad' ? 'alert' : 'status'}
              className={cn(
                'mt-4 rounded-[9px] px-3 py-2.5 text-[12.5px] leading-[1.5]',
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
            className="mt-6 flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#e4f222] to-[#c4d600] text-[14px] font-bold text-[#0a0a0a] shadow-[0_8px_22px_-10px_rgba(228,242,34,0.55)] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
            {mode === 'reset' ? t('sh.auth.sendReset') : mode === 'signup' ? t('sh.auth.createAccount') : t('shell.signIn')}
          </button>

          {mode !== 'reset' ? (
            <p className="mt-5 text-center text-[13px] text-[#9aa1b2]">
              {mode === 'signup' ? t('sh.auth.haveAccount') : t('sh.auth.noAccount')}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                className="font-semibold text-white underline decoration-white/30 underline-offset-[3px] hover:decoration-white"
              >
                {mode === 'signup' ? t('shell.signIn') : t('sh.auth.createOne')}
              </button>
            </p>
          ) : null}

          <p className="mt-6 text-center">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[12px] text-[#6c7385] underline decoration-[#6c7385]/40 underline-offset-2 transition-colors hover:text-[#b7bdcb]"
            >
              {t('sh.auth.keepBrowsing')}
            </button>
          </p>

          <p className="mt-8 border-t border-white/[0.07] pt-5 text-center text-[11.5px] leading-[1.5] text-[#4f5566]">
            {t('sh.auth.questions')}{' '}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-[#e4f222] underline underline-offset-2">
              {t('sh.auth.message', { handle: '@heyfouad' })}
            </a>
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

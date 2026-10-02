import {
  ArrowRight,
  Bell,
  Calculator,
  Lightbulb,
  Lock,
  Search,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { MenuButton } from '@/components/shell/MenuButton';
import { cn } from '@/lib/utils';
import type { ModuleId } from '@/lib/types';
import { MODULE_MAP } from '@/modules/registry';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';

/**
 * News: the founder's announcements to everyone who opens Kanz — laid out as
 * a bento of numbered cards on a drafting grid. The top cluster says what
 * Kanz is, what Pro adds and what comes next; below, every free tool gets a
 * card that opens it.
 */

interface Tool {
  module?: ModuleId;
  icon?: LucideIcon;
  name?: string;
  desc: string;
}

const FREE_TOOLS: Tool[] = [
  { module: 'home', desc: 'nf.free.home' },
  { module: 'portfolio', desc: 'nf.free.portfolio' },
  { module: 'todo', desc: 'nf.free.todo' },
  { module: 'calendar', desc: 'nf.free.calendar' },
  { module: 'habits', desc: 'nf.free.habits' },
  { module: 'saveit', desc: 'nf.free.saveit' },
  { module: 'notebook', desc: 'nf.free.notebook' },
  { module: 'articles', desc: 'nf.free.articles' },
  { module: 'courses', desc: 'nf.free.courses' },
  { module: 'docs', desc: 'nf.free.docs' },
  { module: 'vault', desc: 'nf.free.vault' },
  { module: 'reporting', desc: 'nf.free.reporting' },
  { module: 'analytics', desc: 'nf.free.analytics' },
  { module: 'trash', desc: 'nf.free.trash' },
  { module: 'contact', desc: 'nf.free.contact' },
  { icon: Search, name: 'nf.free.search.name', desc: 'nf.free.search' },
  { icon: Bell, name: 'nf.free.notifications.name', desc: 'nf.free.notifications' },
  { icon: UserRound, name: 'nf.free.profile.name', desc: 'nf.free.profile' },
];

const num = (n: number): string => String(n).padStart(2, '0');

/** One bento card: icon top-left, number top-right, title + text at the foot. */
function Card({
  n,
  icon: Icon,
  tag,
  title,
  children,
  className,
  tone,
  onOpen,
  footer,
}: {
  n: number;
  icon: LucideIcon;
  tag?: string;
  title: string;
  children?: ReactNode;
  className?: string;
  tone?: 'warm' | 'pro' | 'soon' | 'idea';
  onOpen?: () => void;
  footer?: ReactNode;
}): JSX.Element {
  const inner = (
    <>
      <div className="nb-card-top">
        <span className="nb-card-icon" aria-hidden>
          <Icon size={20} strokeWidth={1.5} />
        </span>
        <span className="nb-card-meta">
          {tag ? <span className="nb-card-tag">{tag}</span> : null}
          <span className="nb-card-num">{num(n)}</span>
        </span>
      </div>
      <div className="nb-card-body">
        <h3 className="nb-card-title">{title}</h3>
        {children}
        {footer}
      </div>
    </>
  );
  return onOpen ? (
    <button type="button" className={cn('nb-card is-link', className)} data-tone={tone} onClick={onOpen}>
      {inner}
    </button>
  ) : (
    <article className={cn('nb-card', className)} data-tone={tone}>
      {inner}
    </article>
  );
}

export function NewsModule(): JSX.Element {
  const { t } = useLanguage();
  const { setModule } = useUI();
  const freeRef = useRef<HTMLElement>(null);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-void/78 backdrop-blur-2xl">
      <header className="flex items-center gap-3 border-b border-graphite px-4 py-3.5 md:px-7 md:py-4">
        <MenuButton className="md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-medium leading-tight tracking-[-0.016em] text-paper md:text-[21px]">
            {t('nav.news')}
          </h1>
          <p className="mt-1 truncate text-[12.5px] text-ash">{t('nf.subtitle')}</p>
        </div>
      </header>

      <div className="scroll-y nb-grid-bg min-h-0 flex-1">
        <div className="nb-wrap">
          <p className="nb-from">
            <Sparkles size={13} strokeWidth={2} aria-hidden />
            {t('nf.from')}
          </p>

          {/* ── The story: what Kanz is, Pro, next, your ideas ── */}
          <section className="nb-bento" aria-label={t('nf.kind.guide')}>
            <Card
              n={1}
              icon={Sparkles}
              tag={t('nf.kind.guide')}
              title={t('nf.welcome.title')}
              className="nb-hero"
              tone="warm"
              footer={
                <button
                  type="button"
                  className="nb-link"
                  onClick={() => freeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {t('nf.welcome.cta')}
                  <ArrowRight size={15} strokeWidth={1.8} aria-hidden className="rtl:-scale-x-100" />
                </button>
              }
            >
              <ol className="nb-steps">
                {[1, 2, 3].map((i) => (
                  <li key={i}>
                    <span className="nb-step-k">{num(i)}</span>
                    <span className="nb-step-name">{t(`nf.welcome.step${i}.name`)}</span>
                    <span className="nb-step-desc">{t(`nf.welcome.step${i}.desc`)}</span>
                  </li>
                ))}
              </ol>
              <p className="nb-card-text nb-hero-text">{t('nf.welcome.intro')}</p>
            </Card>

            <Card
              n={2}
              icon={Lock}
              tag={t('nf.kind.pro')}
              title={t('nf.pro.title')}
              tone="pro"
              onOpen={() => setModule('medications')}
            >
              <p className="nb-card-text">{t('nf.pro.medications')}</p>
              <p className="nb-card-note">{t('nf.pro.more')}</p>
            </Card>

            <Card
              n={3}
              icon={Calculator}
              tag={t('nf.kind.soon')}
              title={t('nf.soon.salary.name')}
              tone="soon"
              className="nb-tall"
            >
              <div className="nb-bars" aria-hidden>
                {[42, 68, 34, 82, 56, 74].map((h, i) => (
                  <i key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="nb-card-text">{t('nf.soon.salary')}</p>
            </Card>

            <Card
              n={4}
              icon={Lightbulb}
              tag={t('nf.kind.idea')}
              title={t('nf.idea.title')}
              tone="idea"
              className="nb-wide"
              footer={
                <button type="button" className="nb-link" onClick={() => setModule('contact')}>
                  {t('nf.idea.action')}
                  <ArrowRight size={15} strokeWidth={1.8} aria-hidden className="rtl:-scale-x-100" />
                </button>
              }
            >
              <p className="nb-card-text">{t('nf.idea.intro')}</p>
            </Card>

            <Card n={5} icon={MODULE_MAP.team.icon} tag={t('nf.kind.soon')} title={MODULE_MAP.team.label} tone="soon">
              <p className="nb-card-text">{t('nf.soon.team')}</p>
            </Card>
          </section>

          {/* ── Every free tool ── */}
          <section ref={freeRef} className="nb-section" aria-labelledby="nb-free">
            <div className="nb-section-head">
              <h2 id="nb-free" className="nb-section-title">
                {t('nf.free.title')}
              </h2>
              <p className="nb-section-intro">{t('nf.free.intro')}</p>
            </div>
            <div className="nb-tools">
              {FREE_TOOLS.map((tool, i) => {
                const meta = tool.module ? MODULE_MAP[tool.module] : null;
                return (
                  <Card
                    key={tool.module ?? tool.name}
                    n={i + 1}
                    icon={meta?.icon ?? tool.icon ?? Sparkles}
                    title={meta ? meta.label : t(tool.name ?? '')}
                    onOpen={tool.module ? () => setModule(tool.module!) : undefined}
                  >
                    <p className="nb-card-text">{t(tool.desc)}</p>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

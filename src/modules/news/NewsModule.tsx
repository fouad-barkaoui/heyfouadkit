import {
  ArrowUpRight,
  Bell,
  Calculator,
  Lightbulb,
  Lock,
  Rocket,
  Search,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { MenuButton } from '@/components/shell/MenuButton';
import type { ModuleId } from '@/lib/types';
import { MODULE_MAP } from '@/modules/registry';
import { useLanguage } from '@/state/languageStore';
import { useUI } from '@/state/uiStore';

/**
 * News: the founder's announcements to everyone who opens Kanz — what the
 * platform is for, what each part does, what Pro adds and what comes next.
 * Read-only for visitors; every entry that names a tool opens it.
 */

type Kind = 'guide' | 'free' | 'pro' | 'soon' | 'idea';

interface Entry {
  /** A module to open, or a free-standing item with its own icon + name key. */
  module?: ModuleId;
  icon?: LucideIcon;
  name?: string;
  desc: string;
}

interface Post {
  id: string;
  kind: Kind;
  title: string;
  intro: string;
  entries?: Entry[];
  action?: { label: string; to: ModuleId };
}

const POSTS: Post[] = [
  {
    id: 'welcome',
    kind: 'guide',
    title: 'nf.welcome.title',
    intro: 'nf.welcome.intro',
    entries: [
      { icon: Sparkles, name: 'nf.welcome.step1.name', desc: 'nf.welcome.step1.desc' },
      { icon: Rocket, name: 'nf.welcome.step2.name', desc: 'nf.welcome.step2.desc' },
      { icon: UserRound, name: 'nf.welcome.step3.name', desc: 'nf.welcome.step3.desc' },
    ],
  },
  {
    id: 'free',
    kind: 'free',
    title: 'nf.free.title',
    intro: 'nf.free.intro',
    entries: [
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
    ],
  },
  {
    id: 'pro',
    kind: 'pro',
    title: 'nf.pro.title',
    intro: 'nf.pro.intro',
    entries: [
      { module: 'medications', desc: 'nf.pro.medications' },
      { icon: Lock, name: 'nf.pro.more.name', desc: 'nf.pro.more' },
    ],
  },
  {
    id: 'soon',
    kind: 'soon',
    title: 'nf.soon.title',
    intro: 'nf.soon.intro',
    entries: [
      { icon: Calculator, name: 'nf.soon.salary.name', desc: 'nf.soon.salary' },
      { module: 'team', desc: 'nf.soon.team' },
    ],
  },
  {
    id: 'idea',
    kind: 'idea',
    title: 'nf.idea.title',
    intro: 'nf.idea.intro',
    action: { label: 'nf.idea.action', to: 'contact' },
  },
];

const KIND_ICON: Record<Kind, LucideIcon> = {
  guide: Sparkles,
  free: Rocket,
  pro: Lock,
  soon: Calculator,
  idea: Lightbulb,
};

export function NewsModule(): JSX.Element {
  const { t } = useLanguage();
  const { setModule } = useUI();

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

      <div className="scroll-y min-h-0 flex-1">
        <div className="nf-feed">
          {POSTS.map((post) => {
            const KindIcon = KIND_ICON[post.kind];
            return (
              <article key={post.id} className="nf-post" data-kind={post.kind} aria-labelledby={`nf-${post.id}`}>
                <header className="nf-post-head">
                  <span className="nf-kind">
                    <KindIcon size={13} strokeWidth={2} aria-hidden />
                    {t(`nf.kind.${post.kind}`)}
                  </span>
                  <span className="nf-from">{t('nf.from')}</span>
                </header>
                <h2 id={`nf-${post.id}`} className="nf-title">
                  {t(post.title)}
                </h2>
                <p className="nf-intro">{t(post.intro)}</p>

                {post.entries ? (
                  <ul className="nf-entries">
                    {post.entries.map((e) => {
                      const meta = e.module ? MODULE_MAP[e.module] : null;
                      const Icon = meta?.icon ?? e.icon ?? Sparkles;
                      const name = meta ? meta.label : t(e.name ?? '');
                      const body = (
                        <>
                          <span className="nf-entry-icon" aria-hidden>
                            <Icon size={16} strokeWidth={1.7} />
                          </span>
                          <span className="nf-entry-text">
                            <span className="nf-entry-name">{name}</span>
                            <span className="nf-entry-desc">{t(e.desc)}</span>
                          </span>
                          {e.module ? (
                            <ArrowUpRight className="nf-entry-go rtl:-scale-x-100" size={15} strokeWidth={1.8} aria-hidden />
                          ) : null}
                        </>
                      );
                      return (
                        <li key={e.module ?? e.name}>
                          {e.module ? (
                            <button type="button" className="nf-entry is-link" onClick={() => setModule(e.module!)}>
                              {body}
                            </button>
                          ) : (
                            <div className="nf-entry">{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {post.action ? (
                  <button type="button" className="nf-action" onClick={() => setModule(post.action!.to)}>
                    {t(post.action.label)}
                    <ArrowUpRight size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

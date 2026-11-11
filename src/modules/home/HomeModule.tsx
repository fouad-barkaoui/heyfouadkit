import { ArrowUpRight, BarChart3, Briefcase, CalendarCheck2, ChevronDown, LibraryBig, type LucideIcon } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { PORTFOLIO_URL } from '@/components/shell/TopBar';
import type { ModuleId, Workspace } from '@/lib/types';
import { dueInfo } from '@/modules/todo/taskMeta';
import { getDisplayName, useAuth } from '@/state/authStore';
import { useLanguage } from '@/state/languageStore';
import { useTeam } from '@/state/teamStore';
import { useUI } from '@/state/uiStore';
import { useWorkspace } from '@/state/workspaceStore';

interface Row {
  key: string;
  title: string;
  /** Short uppercase label at the end of the dotted line (a date, or "Open"). */
  meta: string;
  detail: string;
  module: ModuleId;
}

/** Everything in the workspace that carries a "last touched" time. `kind` is a `home2.kind.*` key. */
function collect(ws: Workspace, t: (key: string) => string): { id: string; title: string; when: string; kind: string; module: ModuleId }[] {
  return [
    ...ws.notes.map((n) => ({ id: n.id, title: n.title || t('home2.untitled.note'), when: n.updatedAt, kind: 'note', module: 'notebook' as const })),
    ...ws.todos.map((x) => ({ id: x.id, title: x.title, when: x.updatedAt, kind: 'task', module: 'todo' as const })),
    ...ws.links.map((l) => ({ id: l.id, title: l.title || l.url, when: l.updatedAt, kind: 'link', module: 'saveit' as const })),
    ...ws.articles.map((a) => ({ id: a.id, title: a.title || t('home2.untitled.article'), when: a.updatedAt, kind: 'article', module: 'articles' as const })),
    ...ws.docs.map((d) => ({ id: d.id, title: d.title || t('home2.untitled.document'), when: d.updatedAt, kind: 'document', module: 'docs' as const })),
    ...ws.courses.map((c) => ({ id: c.id, title: c.title || t('home2.untitled.course'), when: c.updatedAt, kind: 'course', module: 'courses' as const })),
    ...ws.news.map((n) => ({ id: n.id, title: n.title || t('home2.untitled.story'), when: n.updatedAt, kind: 'news', module: 'news' as const })),
    ...ws.medicines.map((m) => ({ id: m.id, title: m.name || t('home2.untitled.medicine'), when: m.updatedAt, kind: 'medicine', module: 'medications' as const })),
  ];
}

/** Shown instead of activity while the workspace is still empty. */
const STARTERS: ModuleId[] = ['todo', 'notebook', 'saveit', 'habits', 'calendar', 'docs'];

const SECTIONS: { id: string; icon: LucideIcon; open: ModuleId }[] = [
  { id: 'plan', icon: CalendarCheck2, open: 'todo' },
  { id: 'library', icon: LibraryBig, open: 'saveit' },
  { id: 'workspace', icon: Briefcase, open: 'team' },
  { id: 'insight', icon: BarChart3, open: 'reporting' },
];

const FAQ_COUNT = 7;

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const startOf = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(new Date(iso)) - startOf(new Date())) / 86_400_000);
}

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'home.greeting.lateNight';
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function Faq(): JSX.Element {
  const { t } = useLanguage();
  const { setModule } = useUI();
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  return (
    <section className="home-faq" aria-labelledby={`${base}-title`}>
      <div className="home-faq-intro">
        <h2 id={`${base}-title`}>{t('home.faq.title')}</h2>
        <p>{t('home.faq.lead')}</p>
        <p>
          {t('home.faq.more')}{' '}
          <button type="button" className="home-inline-link" onClick={() => setModule('contact')}>
            {t('home.faq.contact')}
          </button>
        </p>
      </div>
      <div className="home-faq-list">
        {Array.from({ length: FAQ_COUNT }, (_, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="home-faq-item" data-open={isOpen || undefined}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${base}-a${i}`}
                  id={`${base}-q${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{t(`home.faq.q${i + 1}`)}</span>
                  <ChevronDown size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </h3>
              <div className="home-faq-answer" id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`}>
                <div>
                  <p>{t(`home.faq.a${i + 1}`)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HomeModule(): JSX.Element {
  const { workspace, live } = useWorkspace();
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const { setModule } = useUI();
  const { t, locale } = useLanguage();

  const { rows, hasActivity } = useMemo<{ rows: Row[]; hasActivity: boolean }>(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit', year: 'numeric' });
    const latest = collect(workspace, t)
      .filter((r) => !Number.isNaN(new Date(r.when).getTime()))
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 8);
    if (latest.length > 0) {
      const activity = latest.map((r) => ({
        key: `${r.kind}-${r.id}`,
        title: r.title,
        meta: fmt.format(new Date(r.when)).replace(',', ''),
        detail: t(`home2.kind.${r.kind}`),
        module: r.module,
      }));
      return { rows: activity, hasActivity: true };
    }
    const starters = STARTERS.map((id) => ({
      key: id,
      title: t(`nav.${id === 'docs' ? 'docsStorage' : id}`),
      meta: t('home.row.open'),
      detail: t(`home.start.${id}`),
      module: id,
    }));
    return { rows: starters, hasActivity: false };
  }, [workspace, t, locale]);

  const summary = useMemo(() => {
    const open = workspace.todos.filter((x) => x.status !== 'completed' && x.status !== 'archived');
    const soon = open.filter((x) => dueInfo(x)?.overdue || daysUntil(x.dueDate) <= 1).length;
    return { open: open.length, soon };
  }, [workspace]);

  const first = getDisplayName(user).split(' ')[0];
  const lead = !user
    ? t('home.lead.guest')
    : [
        t('home.lead.open', { count: summary.open }),
        summary.soon > 0 ? t('home.lead.soon', { count: summary.soon }) : null,
        live && activeTeam ? activeTeam.name : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <div className="home scroll-y">
      <div className="home-frame">
        <header className="home-head">
          <h1>
            {t(greetingKey())}
            {user && first ? `, ${first}` : ''}
          </h1>
          <p>{lead}</p>
        </header>

        <section aria-labelledby="home-list-title">
          <h2 id="home-list-title" className="home-eyebrow">
            {hasActivity ? t('home.recentActivity') : t('home.startHere')}
          </h2>
          <ul className="home-rows">
            {rows.map((row) => (
              <li key={row.key}>
                <button type="button" onClick={() => setModule(row.module)}>
                  <span className="home-row-line">
                    <span className="home-row-title">{row.title}</span>
                    <span className="home-row-dots" aria-hidden />
                    <span className="home-row-meta">{row.meta}</span>
                  </span>
                  <span className="home-row-detail">{row.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="home-features" aria-labelledby="home-features-title">
        <h2 id="home-features-title">{t('home.features.title')}</h2>
        <p>{t('home.features.lead')}</p>
        <div className="home-feature-grid">
          {SECTIONS.map(({ id, icon: Icon, open }) => (
            <button key={id} type="button" className="home-feature" onClick={() => setModule(open)}>
              <span className="home-feature-icon" aria-hidden>
                <Icon size={18} strokeWidth={1.6} />
              </span>
              <span className="home-feature-title">{t(`nav.group.${id}`)}</span>
              <span className="home-feature-text">{t(`home.features.${id}`)}</span>
            </button>
          ))}
        </div>
      </section>

      <Faq />

      <footer className="home-foot">
        <span>{t('home.foot.built')}</span>
        <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          {t('home.foot.portfolio')}
          <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden />
        </a>
      </footer>
    </div>
  );
}

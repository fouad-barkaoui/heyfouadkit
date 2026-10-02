import * as Dialog from '@radix-ui/react-dialog';
import {
  Calculator,
  CheckSquare,
  FileText,
  Flame,
  GraduationCap,
  Lightbulb,
  Lock,
  MessageSquareHeart,
  NotebookPen,
  Pill,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MARK_SRC } from '@/components/ui/BrandMark';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';

/**
 * Shown once before anything else: a small tour of what Kanz offers, with a
 * list on the left and a picture + note on the right, ending at News.
 */

type TopicId = 'start' | 'free' | 'pro' | 'soon' | 'idea';

const TOPICS: { id: TopicId; label: string }[] = [
  { id: 'start', label: 'nf.kind.guide' },
  { id: 'free', label: 'nf.tour.free.label' },
  { id: 'pro', label: 'nf.kind.pro' },
  { id: 'soon', label: 'nf.tour.soon.label' },
  { id: 'idea', label: 'nf.kind.idea' },
];

function Sparkle({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 0c.9 6.4 5.6 11.1 12 12-6.4.9-11.1 5.6-12 12-.9-6.4-5.6-11.1-12-12C6.4 11.1 11.1 6.4 12 0Z" />
    </svg>
  );
}

function Tile({ icon: Icon }: { icon: LucideIcon }): JSX.Element {
  return (
    <span className="sh-tile">
      <Icon size={18} strokeWidth={1.7} />
    </span>
  );
}

/** A small white "screen" floating on the coloured stage. */
function Art({ id }: { id: TopicId }): JSX.Element {
  const { t } = useLanguage();
  let content: ReactNode;
  if (id === 'start') {
    content = (
      <>
        <div className="sh-art-row">
          <img src={MARK_SRC} alt="" width={40} height={40} className="sh-art-mark" />
          <div className="min-w-0">
            <p className="sh-art-title">{t('nf.welcome.title')}</p>
            <p className="sh-art-sub">{t('nf.tour.start.chip')}</p>
          </div>
        </div>
        <div className="sh-art-lines">
          <i style={{ width: '86%' }} />
          <i style={{ width: '64%' }} />
          <i style={{ width: '72%' }} />
        </div>
      </>
    );
  } else if (id === 'free') {
    content = (
      <div className="sh-art-grid">
        {[CheckSquare, Flame, NotebookPen, FileText, GraduationCap, Sparkles].map((I, i) => (
          <Tile key={i} icon={I} />
        ))}
      </div>
    );
  } else if (id === 'pro') {
    content = (
      <div className="sh-art-row">
        <Tile icon={Pill} />
        <div className="min-w-0 flex-1">
          <p className="sh-art-title">{t('nav.medications')}</p>
          <p className="sh-art-sub">{t('nf.tour.pro.chip')}</p>
        </div>
        <span className="sh-art-badge">
          <Lock size={12} strokeWidth={2.2} /> {t('nf.kind.pro')}
        </span>
      </div>
    );
  } else if (id === 'soon') {
    content = (
      <>
        <div className="sh-art-row">
          <Tile icon={Calculator} />
          <div className="min-w-0">
            <p className="sh-art-title">{t('nf.soon.salary.name')}</p>
            <p className="sh-art-sub">{t('nf.kind.soon')}</p>
          </div>
        </div>
        <div className="sh-art-bars" aria-hidden>
          <i style={{ height: '46%' }} />
          <i style={{ height: '72%' }} />
          <i style={{ height: '38%' }} />
          <i style={{ height: '88%' }} />
          <i style={{ height: '60%' }} />
        </div>
      </>
    );
  } else {
    content = (
      <>
        <div className="sh-art-row">
          <Tile icon={Lightbulb} />
          <p className="sh-art-title">{t('nf.idea.title')}</p>
        </div>
        <div className="sh-art-msg">
          <MessageSquareHeart size={15} strokeWidth={1.8} />
          <span>{t('nf.tour.idea.chip')}</span>
          <span className="sh-art-send" />
        </div>
      </>
    );
  }
  return (
    <div className="sh-stage" data-topic={id}>
      <Sparkle className="sh-spark is-a" />
      <Sparkle className="sh-spark is-b" />
      <Sparkle className="sh-spark is-c" />
      <Sparkle className="sh-spark is-d" />
      <div key={id} className="sh-screen">
        {content}
      </div>
    </div>
  );
}

export function StartHereModal({
  open,
  onOpen,
  onLater,
}: {
  open: boolean;
  onOpen: () => void;
  onLater: () => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [topic, setTopic] = useState<TopicId>('start');

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : onLater())}>
      <Dialog.Portal>
        <Dialog.Overlay className="sh-overlay" />
        <Dialog.Content className="sh-dialog" aria-describedby="sh-desc">
          <nav className="sh-side" aria-label={t('nf.tour.title')}>
            <Dialog.Title className="sh-side-title">{t('nf.tour.title')}</Dialog.Title>
            <ul className="sh-topics" role="tablist" aria-orientation="vertical">
              {TOPICS.map((tp) => (
                <li key={tp.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={topic === tp.id}
                    data-active={topic === tp.id || undefined}
                    className="sh-topic"
                    onClick={() => setTopic(tp.id)}
                  >
                    {t(tp.label)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sh-main">
            <Dialog.Close className="sh-close" aria-label={t('nf.start.later')}>
              <X size={16} strokeWidth={2} />
            </Dialog.Close>
            <Art id={topic} />
            <div className="sh-copy">
              <h3 className="sh-copy-title">{t(`nf.tour.${topic}.title`)}</h3>
              <p id="sh-desc" className="sh-copy-text">
                {t(`nf.tour.${topic}.text`)}
              </p>
            </div>
            <div className="sh-actions">
              <button type="button" className={cn('sh-btn')} onClick={onLater}>
                {t('nf.start.later')}
              </button>
              <button type="button" className="sh-btn is-primary" onClick={onOpen}>
                {t('nf.start.go')}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

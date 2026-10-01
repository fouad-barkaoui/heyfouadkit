import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FieldRow, Label, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { TagInput } from '@/components/ui/TagInput';
import type { NewsItem, NewsStage } from '@/lib/types';
import { nowISO, uid } from '@/lib/utils';
import { useLanguage } from '@/state/languageStore';
import { NEWS_STAGES, STAGE_LABEL } from './newsMeta';

interface NewsDraft {
  title: string;
  content: string;
  stage: NewsStage;
  tags: string[];
}

const blank = (): NewsDraft => ({ title: '', content: '', stage: 'ideas', tags: [] });

export function NewsEditor({
  open,
  onOpenChange,
  item,
  initialStage,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: NewsItem | null;
  /** Stage to pre-select for a brand-new story (e.g. "+" pressed from a column). Ignored when editing. */
  initialStage?: NewsStage;
  onSave: (item: NewsItem) => void;
}): JSX.Element {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<NewsDraft>(blank);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setDraft(
      item
        ? { title: item.title, content: item.content, stage: item.stage, tags: item.tags }
        : { ...blank(), stage: initialStage ?? 'ideas' },
    );
  }, [open, item, initialStage]);

  const valid = draft.title.trim().length > 0;

  const submit = (): void => {
    setTouched(true);
    if (!valid) return;
    const base: NewsItem = item ?? {
      id: uid('news'),
      title: '',
      content: '',
      stage: 'ideas',
      tags: [],
      isInteresting: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    onSave({
      ...base,
      title: draft.title.trim() || t('news.untitled'),
      content: draft.content,
      stage: draft.stage,
      tags: draft.tags,
      updatedAt: nowISO(),
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? t('news.editStory') : t('news.newStory')}
      description={t('news.editor.description')}
      width="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>{t('news.cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {item ? t('news.saveChanges') : t('news.createStory')}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label htmlFor="news-title">{t('news.field.title')}</Label>
        <TextInput
          id="news-title"
          autoFocus
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder={t('news.field.titlePlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) submit();
          }}
        />
        {touched && !valid ? <p className="mt-1.5 text-[12px] text-coral">{t('news.field.titleRequired')}</p> : null}
      </FieldRow>

      <FieldRow>
        <Label htmlFor="news-stage">{t('news.field.stage')}</Label>
        <Select
          id="news-stage"
          value={draft.stage}
          onChange={(e) => setDraft({ ...draft, stage: e.target.value as NewsStage })}
        >
          {NEWS_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow>
        <Label htmlFor="news-content">{t('news.field.body')}</Label>
        <TextArea
          id="news-content"
          rows={8}
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          placeholder={t('news.field.bodyPlaceholder')}
        />
      </FieldRow>

      <FieldRow>
        <Label>{t('news.field.tags')}</Label>
        <TagInput tags={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} />
      </FieldRow>
    </Modal>
  );
}

import { Bug, Handshake, Lightbulb, MessageSquareHeart, MessagesSquare, type LucideIcon } from 'lucide-react';
import type { ContactTopic } from '@/data/contact';
import { translate } from '@/state/languageStore';

export interface TopicInfo {
  id: ContactTopic;
  /** Translated when read, so it always follows the current language. */
  readonly label: string;
  icon: LucideIcon;
  readonly hint: string;
}

function topic(id: ContactTopic, icon: LucideIcon): TopicInfo {
  return {
    id,
    icon,
    get label() {
      return translate(`cf.topic.${id}`);
    },
    get hint() {
      return translate(`cf.topic.${id}.hint`);
    },
  };
}

export const TOPICS: TopicInfo[] = [
  topic('feedback', MessageSquareHeart),
  topic('bug', Bug),
  topic('idea', Lightbulb),
  topic('collab', Handshake),
  topic('other', MessagesSquare),
];

/** `TOPIC_LABEL[id]` — each entry is a getter, translated on every read. */
export const TOPIC_LABEL = Object.defineProperties(
  {},
  Object.fromEntries(
    TOPICS.map((t) => [t.id, { enumerable: true, get: () => translate(`cf.topic.${t.id}`) }]),
  ),
) as Record<ContactTopic, string>;

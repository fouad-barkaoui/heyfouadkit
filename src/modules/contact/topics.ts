import { Bug, Handshake, Lightbulb, MessageSquareHeart, MessagesSquare, type LucideIcon } from 'lucide-react';
import type { ContactTopic } from '@/data/contact';

export const TOPICS: { id: ContactTopic; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart, hint: 'What you like, what feels off' },
  { id: 'bug', label: 'Bug report', icon: Bug, hint: 'What you did, what you expected, what happened' },
  { id: 'idea', label: 'Feature idea', icon: Lightbulb, hint: 'The problem it would solve for you' },
  { id: 'collab', label: 'Collaboration', icon: Handshake, hint: 'Who you are and what you have in mind' },
  { id: 'other', label: 'Other', icon: MessagesSquare, hint: 'Anything else' },
];

export const TOPIC_LABEL: Record<ContactTopic, string> = Object.fromEntries(TOPICS.map((t) => [t.id, t.label])) as Record<
  ContactTopic,
  string
>;


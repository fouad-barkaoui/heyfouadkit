export type ModuleId =
  | 'home'
  | 'notebook'
  | 'todo'
  | 'calendar'
  | 'habits'
  | 'team'
  | 'news'
  | 'saveit'
  | 'medications'
  | 'articles'
  | 'courses'
  | 'docs'
  | 'vault'
  | 'reporting'
  | 'analytics'
  | 'trash'
  | 'portfolio'
  | 'contact'
  | 'inbox';

export type ItemType = 'note' | 'article' | 'todo' | 'doc' | 'course' | 'news' | 'medicine' | 'link' | 'habit' | 'goal';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'backlog' | 'in_progress' | 'completed' | 'archived';
export type BadgeScope = 'course' | 'doc' | 'general';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Badge {
  id: string;
  name: string;
  colorHex: string;
  iconName: string;
  category: BadgeScope;
  createdAt: string;
}

/** Fields shared by every trashable record — soft-deleted items are kept
 * around (and shown in the Trash module) until restored or purged for good. */
export interface Trashable {
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface Note extends Trashable {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isInteresting: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Todo extends Trashable {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** When the task's bar should start on the Calendar view — falls back to createdAt when unset. */
  startDate: string | null;
  dueDate: string | null;
  recurrence: Recurrence;
  isInteresting: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ArticleKind = 'written' | 'pdf' | 'image';

export interface Article extends Trashable {
  id: string;
  title: string;
  kind: ArticleKind;
  content: string;
  tags: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  isInteresting: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course extends Trashable {
  id: string;
  title: string;
  url: string;
  description: string;
  badgeId: string | null;
  progress: number;
  isInteresting: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Doc extends Trashable {
  id: string;
  title: string;
  content: string;
  folder: string;
  badgeId: string | null;
  isInteresting: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  ownerType: ItemType;
  ownerId: string;
  name: string;
  mimeType: string;
  size: number;
  /** Set when the file lives in Supabase Storage. */
  storagePath: string | null;
  /** Set when the file is held locally as a data URL (offline / signed out). */
  dataUrl: string | null;
  createdAt: string;
}

/** Editorial pipeline stage for a News item — left-to-right column order on the board. */
export type NewsStage = 'ideas' | 'research' | 'outline' | 'draft' | 'in_review' | 'published';

export interface NewsItem extends Trashable {
  id: string;
  title: string;
  content: string;
  stage: NewsStage;
  tags: string[];
  isInteresting: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Medications Catalog & Tracker ───────────────────────────────────────── */

export type DoseUnit = 'mg' | 'mL' | 'tablet' | 'capsule' | 'g';
export type MedicineType = 'scheduled' | 'as_needed';
export type DurationUnit = 'Days' | 'Weeks' | 'Months';
export type TreatmentStatus = 'active' | 'completed';

export interface Medicine extends Trashable {
  id: string;
  name: string;
  dosage: string;
  unit: DoseUnit;
  type: MedicineType;
  /** Weekdays this medicine is taken on, 0 = Sunday … 6 = Saturday. Ignored for `as_needed`. */
  days: number[];
  /** Daily intake times, e.g. "8:30 AM". */
  times: string[];
  startDate: string;
  /** null = ongoing (∞), no end date set. */
  endDate: string | null;
  durationValue: number;
  durationUnit: DurationUnit;
  /** Links this medicine to a Treatment Plan; null = unassigned / individual. */
  treatmentPlanId: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlan extends Trashable {
  id: string;
  condition: string;
  prescriber: string;
  status: TreatmentStatus;
  createdAt: string;
  updatedAt: string;
}

/* ── SaveIt ──────────────────────────────────────────────────────────────── */

export type LinkKind = 'video' | 'article' | 'repo' | 'social' | 'audio' | 'pdf' | 'image' | 'website';
export type LinkStatus = 'unread' | 'read';

export interface SavedLink extends Trashable {
  id: string;
  url: string;
  title: string;
  description: string;
  kind: LinkKind;
  siteName: string;
  domain: string;
  /** Preview image (og:image, video thumbnail…). */
  image: string | null;
  favicon: string | null;
  /** In-app player URL for videos / audio that can be embedded. */
  embedUrl: string | null;
  tags: string[];
  collection: string;
  note: string;
  status: LinkStatus;
  readingMinutes: number | null;
  /** The site's theme colour, used to tint its card. */
  accent: string | null;
  isInteresting: boolean;
  openedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Habits & Goals ──────────────────────────────────────────────────────── */

export interface Habit extends Trashable {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** Weekdays it's scheduled on, 0 = Sunday … 6 = Saturday. Empty = every day. */
  days: number[];
  /** Local dates it was done, as YYYY-MM-DD. */
  log: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalStep {
  id: string;
  title: string;
  done: boolean;
  /** Set once the step has been sent to Tasks. */
  todoId: string | null;
  dueDate: string | null;
}

export type GoalStatus = 'active' | 'achieved' | 'paused';

export interface Goal extends Trashable {
  id: string;
  title: string;
  why: string;
  emoji: string;
  color: string;
  dueDate: string | null;
  steps: GoalStep[];
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  badges: Badge[];
  notes: Note[];
  todos: Todo[];
  articles: Article[];
  courses: Course[];
  docs: Doc[];
  attachments: Attachment[];
  news: NewsItem[];
  medicines: Medicine[];
  treatmentPlans: TreatmentPlan[];
  links: SavedLink[];
  habits: Habit[];
  goals: Goal[];
}

export type CollectionKey = keyof Workspace;

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Team {
  id: string;
  name: string;
  role: TeamRole;
}

export interface TeamMember {
  userId: string;
  role: TeamRole;
  joinedAt: string;
  username: string;
  email: string;
}

export interface TeamInvite {
  id: string;
  role: TeamRole;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number;
  useCount: number;
}

export interface SearchHit {
  id: string;
  type: ItemType | 'badge';
  module: ModuleId;
  title: string;
  excerpt: string;
  updatedAt: string;
}

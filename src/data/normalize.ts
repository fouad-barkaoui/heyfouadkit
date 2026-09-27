import type {
  Article,
  Attachment,
  Badge,
  Course,
  Doc,
  DoseUnit,
  DurationUnit,
  ItemType,
  Medicine,
  MedicineType,
  Note,
  NewsItem,
  Todo,
  TreatmentPlan,
  TreatmentStatus,
  Workspace,
} from '@/lib/types';
import { nowISO, uid } from '@/lib/utils';

/**
 * Records written by earlier versions of the app can be missing fields that
 * newer UI reads unconditionally (`record.tags.length`, for instance).
 * Everything read from storage passes through here first, so one legacy row
 * can never blank the workspace.
 */

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown): boolean => v === true;
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const nullableStr = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

function stamps(raw: Record<string, unknown>): { createdAt: string; updatedAt: string } {
  const createdAt = str(raw.createdAt) || nowISO();
  return { createdAt, updatedAt: str(raw.updatedAt) || createdAt };
}

/** Trash bookkeeping shared by every collection the Trash module reads from —
 * without this, a soft-deleted record would silently un-delete itself the
 * next time the workspace is normalized (on load, or after a remote patch). */
function trash(raw: Record<string, unknown>): { isDeleted: boolean; deletedAt: string | null } {
  return { isDeleted: bool(raw.isDeleted), deletedAt: nullableStr(raw.deletedAt) };
}

export function normalizeBadge(raw: Record<string, unknown>): Badge {
  return {
    id: str(raw.id) || uid('bdg'),
    name: str(raw.name, 'Untitled'),
    colorHex: /^#[0-9a-f]{3,8}$/i.test(str(raw.colorHex)) ? str(raw.colorHex) : '#6366f1',
    iconName: str(raw.iconName, 'tag'),
    category: oneOf(raw.category, ['course', 'doc', 'general'] as const, 'general'),
    createdAt: str(raw.createdAt) || nowISO(),
  };
}

export function normalizeNote(raw: Record<string, unknown>): Note {
  return {
    id: str(raw.id) || uid('note'),
    title: str(raw.title, 'Untitled note'),
    content: str(raw.content),
    tags: strArr(raw.tags),
    isInteresting: bool(raw.isInteresting),
    ...stamps(raw),
    ...trash(raw),
  };
}

export function normalizeTodo(raw: Record<string, unknown>): Todo {
  return {
    id: str(raw.id) || uid('todo'),
    title: str(raw.title, 'Untitled task'),
    description: str(raw.description),
    priority: oneOf(raw.priority, ['low', 'medium', 'high', 'critical'] as const, 'medium'),
    status: oneOf(raw.status, ['backlog', 'in_progress', 'completed', 'archived'] as const, 'backlog'),
    startDate: nullableStr(raw.startDate),
    dueDate: nullableStr(raw.dueDate),
    recurrence: oneOf(raw.recurrence, ['none', 'daily', 'weekly', 'monthly'] as const, 'none'),
    isInteresting: bool(raw.isInteresting),
    ...stamps(raw),
    ...trash(raw),
  };
}

export function normalizeArticle(raw: Record<string, unknown>): Article {
  const fileType = nullableStr(raw.fileType);
  const inferredKind = fileType?.startsWith('image/')
    ? 'image'
    : fileType === 'application/pdf'
      ? 'pdf'
      : 'written';
  return {
    id: str(raw.id) || uid('art'),
    title: str(raw.title, 'Untitled article'),
    kind: oneOf(raw.kind, ['written', 'pdf', 'image'] as const, inferredKind),
    content: str(raw.content),
    tags: strArr(raw.tags),
    fileUrl: nullableStr(raw.fileUrl),
    fileName: nullableStr(raw.fileName),
    fileType,
    fileSize: typeof raw.fileSize === 'number' ? raw.fileSize : null,
    isInteresting: bool(raw.isInteresting),
    ...stamps(raw),
    ...trash(raw),
  };
}

export function normalizeCourse(raw: Record<string, unknown>): Course {
  return {
    id: str(raw.id) || uid('crs'),
    title: str(raw.title, 'Untitled course'),
    url: str(raw.url),
    description: str(raw.description),
    badgeId: nullableStr(raw.badgeId),
    progress: Math.min(100, Math.max(0, Math.round(num(raw.progress, 0)))),
    isInteresting: bool(raw.isInteresting),
    ...stamps(raw),
    ...trash(raw),
  };
}

export function normalizeDoc(raw: Record<string, unknown>): Doc {
  return {
    id: str(raw.id) || uid('doc'),
    title: str(raw.title, 'Untitled document'),
    content: str(raw.content),
    folder: str(raw.folder, 'General'),
    badgeId: nullableStr(raw.badgeId),
    isInteresting: bool(raw.isInteresting),
    ...stamps(raw),
    ...trash(raw),
  };
}

export function normalizeNewsItem(raw: Record<string, unknown>): NewsItem {
  return {
    id: str(raw.id) || uid('news'),
    title: str(raw.title, 'Untitled story'),
    content: str(raw.content),
    stage: oneOf(
      raw.stage,
      ['ideas', 'research', 'outline', 'draft', 'in_review', 'published'] as const,
      'ideas',
    ),
    tags: strArr(raw.tags),
    isInteresting: bool(raw.isInteresting),
    ...stamps(raw),
    ...trash(raw),
  };
}

const numArr = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && x >= 0 && x <= 6) : [];

export function normalizeMedicine(raw: Record<string, unknown>): Medicine {
  return {
    id: str(raw.id) || uid('med'),
    name: str(raw.name, 'Untitled medicine'),
    dosage: str(raw.dosage, '1'),
    unit: oneOf(raw.unit, ['mg', 'mL', 'tablet', 'capsule', 'g'] as const, 'mg') as DoseUnit,
    type: oneOf(raw.type, ['scheduled', 'as_needed'] as const, 'scheduled') as MedicineType,
    days: numArr(raw.days),
    times: strArr(raw.times),
    startDate: str(raw.startDate) || nowISO(),
    endDate: nullableStr(raw.endDate),
    durationValue: Math.max(1, Math.round(num(raw.durationValue, 7))),
    durationUnit: oneOf(raw.durationUnit, ['Days', 'Weeks', 'Months'] as const, 'Days') as DurationUnit,
    treatmentPlanId: nullableStr(raw.treatmentPlanId),
    completed: bool(raw.completed),
    ...stamps(raw),
    ...trash(raw),
  };
}

export function normalizeTreatmentPlan(raw: Record<string, unknown>): TreatmentPlan {
  return {
    id: str(raw.id) || uid('plan'),
    condition: str(raw.condition, 'Untitled plan'),
    prescriber: str(raw.prescriber, 'Self-managed'),
    status: oneOf(raw.status, ['active', 'completed'] as const, 'active') as TreatmentStatus,
    ...stamps(raw),
    ...trash(raw),
  };
}

export function normalizeAttachment(raw: Record<string, unknown>): Attachment {
  return {
    id: str(raw.id) || uid('att'),
    ownerType: oneOf(raw.ownerType, ['note', 'article', 'todo', 'doc', 'course'] as const, 'note') as ItemType,
    ownerId: str(raw.ownerId),
    name: str(raw.name, 'file'),
    mimeType: str(raw.mimeType),
    size: num(raw.size, 0),
    storagePath: nullableStr(raw.storagePath),
    dataUrl: nullableStr(raw.dataUrl),
    createdAt: str(raw.createdAt) || nowISO(),
  };
}

const asRecords = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];

export function normalizeWorkspace(raw: unknown): Workspace {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    badges: asRecords(src.badges).map(normalizeBadge),
    notes: asRecords(src.notes).map(normalizeNote),
    todos: asRecords(src.todos).map(normalizeTodo),
    articles: asRecords(src.articles).map(normalizeArticle),
    courses: asRecords(src.courses).map(normalizeCourse),
    docs: asRecords(src.docs).map(normalizeDoc),
    attachments: asRecords(src.attachments).map(normalizeAttachment).filter((a) => a.ownerId !== ''),
    news: asRecords(src.news).map(normalizeNewsItem),
    medicines: asRecords(src.medicines).map(normalizeMedicine),
    treatmentPlans: asRecords(src.treatmentPlans).map(normalizeTreatmentPlan),
  };
}

export const emptyWorkspace = (): Workspace => ({
  badges: [],
  notes: [],
  todos: [],
  articles: [],
  courses: [],
  docs: [],
  attachments: [],
  news: [],
  medicines: [],
  treatmentPlans: [],
});

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Dictionary } from '@/i18n/types';

export type Language = 'en' | 'ar';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Sidebar / shell chrome
    'nav.home': 'Home',
    'nav.docs': 'Docs',
    'nav.docsStorage': 'Docs Storage',
    'nav.team': 'Team',
    'nav.news': 'News',
    'nav.saveit': 'SaveIt',
    'nav.medications': 'Medications Catalog',
    'nav.salary': 'Salary Planner',
    'nav.todo': 'Tasks',
    'nav.vault': 'Vault',
    'nav.calendar': 'Calendar',
    'nav.reporting': 'Reporting',
    'nav.courses': 'Course Hub',
    'nav.articles': 'Articles & Media',
    'nav.analytics': 'Analytics',
    'nav.notebook': 'Notebook',
    'nav.badges': 'Badges',
    'nav.trash': 'Trash',
    'nav.contact': 'Contact',
    'nav.inbox': 'Inbox',
    'nav.essentials': 'Essentials',
    'nav.habits': 'Habits & Goals',
    'nav.group.plan': 'Plan',
    'nav.group.library': 'Library',
    'nav.group.workspace': 'Workspace',
    'nav.group.insight': 'Insight',
    'nav.insight': 'Insight',
    'shell.search': 'Search',
    'shell.signIn': 'Sign in',
    'shell.live': 'Live',
    'shell.queued': 'Offline · saved',
    'shell.cloudReady': 'Cloud ready',
    'shell.syncing': 'Syncing…',
    'shell.syncFailed': 'Sync failed',
    'shell.onThisDevice': 'On this device',
    'shell.account': 'Account',
    'notif.title': 'Notifications',
    'notif.open': 'Notifications',
    'notif.missed': 'Missed',
    'notif.messages': 'New messages',
    'notif.today': 'Coming up today',
    'notif.clear': 'Clear all',
    'notif.dismiss': 'Dismiss',
    'notif.empty': "You're all caught up",
    'notif.emptyHint': 'Overdue tasks, missed habits and goal deadlines will show up here.',
    'notif.alerts': 'Phone & desktop alerts',
    'notif.alertsHint': 'Get an alert on this device when something is missed.',
    'notif.alertsDenied': 'Blocked. Allow notifications for this site in your browser settings.',
    'notif.alertsUnsupported': 'This browser can’t show alerts. On iPhone, add the app to your Home Screen first.',

    // Settings modal
    'settings.language': 'Language',
    'theme.light': 'Light',
    'theme.dark': 'Dark',

    // Team
    'team.create': 'Create team',
    'team.invite': 'Invite',

    // Contact (embedded in Settings)

    // Trash
    'trash.title': 'Trash',
    'trash.restore': 'Restore',
    'trash.permanent': 'Permanently Delete',
    'trash.item': 'item',
    'trash.items': 'items',
    'trash.inTrash': 'in trash',
    'trash.empty.title': 'Trash is empty',
    'trash.empty.hint': 'Deleted items will appear here for 30 days before permanent deletion.',
    'trash.deleted': 'Deleted',
    'trash.autoDelete': 'Auto-delete after 30 days',
    'trash.emptyTrash': 'Empty trash',
    'trash.confirmEmpty': 'Permanently delete all items in trash? This cannot be undone.',

    // Home dashboard
    'home.greeting.lateNight': 'Working late',
    'home.greeting.morning': 'Good morning',
    'home.greeting.afternoon': 'Good afternoon',
    'home.greeting.evening': 'Good evening',
    'home.recentActivity': 'Recent activity',
  },
  ar: {
    // Sidebar / shell chrome
    'nav.home': 'الرئيسية',
    'nav.docs': 'الوثائق',
    'nav.docsStorage': 'تخزين الوثائق',
    'nav.team': 'الفريق',
    'nav.news': 'الأخبار',
    'nav.saveit': 'المحفوظات',
    'nav.medications': 'كتالوج الأدوية',
    'nav.salary': 'مخطِّط الراتب',
    'nav.todo': 'المهام',
    'nav.vault': 'الخزنة',
    'nav.calendar': 'التقويم',
    'nav.reporting': 'التقارير',
    'nav.courses': 'مركز الدورات',
    'nav.articles': 'المقالات والوسائط',
    'nav.analytics': 'التحليلات',
    'nav.notebook': 'دفتر الملاحظات',
    'nav.badges': 'الشارات',
    'nav.trash': 'سلة المحذوفات',
    'nav.contact': 'تواصل معي',
    'nav.inbox': 'صندوق الرسائل',
    'nav.essentials': 'الأساسيات',
    'nav.habits': 'العادات والأهداف',
    'nav.group.plan': 'التخطيط',
    'nav.group.library': 'المكتبة',
    'nav.group.workspace': 'مساحة العمل',
    'nav.group.insight': 'الرؤى',
    'nav.insight': 'الرؤى',
    'shell.search': 'بحث',
    'shell.signIn': 'تسجيل الدخول',
    'shell.live': 'متصل',
    'shell.queued': 'غير متصل · محفوظ',
    'shell.cloudReady': 'السحابة جاهزة',
    'shell.syncing': 'جارٍ المزامنة…',
    'shell.syncFailed': 'فشلت المزامنة',
    'shell.onThisDevice': 'على هذا الجهاز',
    'shell.account': 'الحساب',
    'notif.title': 'الإشعارات',
    'notif.open': 'الإشعارات',
    'notif.missed': 'فائتة',
    'notif.messages': 'رسائل جديدة',
    'notif.today': 'اليوم',
    'notif.clear': 'مسح الكل',
    'notif.dismiss': 'إخفاء',
    'notif.empty': 'لا شيء فاتك',
    'notif.emptyHint': 'ستظهر هنا المهام المتأخرة والعادات الفائتة ومواعيد الأهداف.',
    'notif.alerts': 'تنبيهات الهاتف والحاسوب',
    'notif.alertsHint': 'احصل على تنبيه على هذا الجهاز عندما يفوتك شيء.',
    'notif.alertsDenied': 'محظورة. اسمح بالإشعارات لهذا الموقع من إعدادات المتصفح.',
    'notif.alertsUnsupported': 'هذا المتصفح لا يدعم التنبيهات. على الآيفون، أضف التطبيق إلى الشاشة الرئيسية أولاً.',

    // Settings modal
    'settings.language': 'اللغة',
    'theme.light': 'فاتح',
    'theme.dark': 'داكن',

    // Team
    'team.create': 'إنشاء فريق',
    'team.invite': 'دعوة',

    // Contact (embedded in Settings)

    // Trash
    'trash.title': 'سلة المحذوفات',
    'trash.restore': 'استعادة',
    'trash.permanent': 'حذف نهائي',
    'trash.item': 'عنصر',
    'trash.items': 'عناصر',
    'trash.inTrash': 'في السلة',
    'trash.empty.title': 'السلة فارغة',
    'trash.empty.hint': 'ستظهر العناصر المحذوفة هنا لمدة 30 يومًا قبل الحذف النهائي.',
    'trash.deleted': 'حُذف',
    'trash.autoDelete': 'حذف تلقائي بعد 30 يومًا',
    'trash.emptyTrash': 'إفراغ السلة',
    'trash.confirmEmpty': 'هل تريد حذف جميع عناصر السلة نهائيًا؟ لا يمكن التراجع عن هذا.',

    // Home dashboard
    'home.greeting.lateNight': 'سهرة طويلة',
    'home.greeting.morning': 'صباح الخير',
    'home.greeting.afternoon': 'مساء الخير',
    'home.greeting.evening': 'مساء الخير',
    'home.recentActivity': 'النشاط الأخير',
  },
};

/* Each area keeps its own phrases in src/i18n/<area>.ts; merge them all in. */
// Test files and the type module are not dictionaries — never bundle them.
const AREAS = import.meta.glob<{ default: Dictionary }>(['../i18n/*.ts', '!../i18n/*.test.ts', '!../i18n/types.ts'], {
  eager: true,
});
for (const [path, mod] of Object.entries(AREAS)) {
  if (path.endsWith('/types.ts') || !mod.default) continue;
  Object.assign(TRANSLATIONS.en, mod.default.en);
  Object.assign(TRANSLATIONS.ar, mod.default.ar);
}

export type TranslateVars = Record<string, string | number>;

function fill(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** The language currently on screen — for code outside React (errors, toasts). */
let currentLanguage: Language = 'en';

/**
 * Translate outside a component: `translate('todo.saved')` or
 * `translate('files.tooBig', { name })`. Falls back to English, then the key.
 */
export function translate(key: string, vars?: TranslateVars): string {
  return fill(TRANSLATIONS[currentLanguage][key] ?? TRANSLATIONS.en[key] ?? key, vars);
}

/** BCP-47 tag for dates and numbers in the current language (Latin digits). */
export function localeTag(lang: Language = currentLanguage): string {
  return lang === 'ar' ? 'ar-MA' : 'en-US';
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** `t('key')` or `t('key', { name: 'Fouad' })` for phrases with {name} slots. */
  t: (key: string, vars?: TranslateVars) => string;
  /** Locale tag for toLocaleString / Intl in the current language. */
  locale: string;
  isArabic: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'kanz.language.v1';

function readStored(): Language {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'ar' || raw === 'en' ? raw : 'en';
  } catch {
    return 'en';
  }
}

function applyDirection(lang: Language): void {
  currentLanguage = lang;
  if (typeof document === 'undefined') return;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

export function LanguageProvider({ children }: { children: ReactNode }): JSX.Element {
  const [language, setLanguageState] = useState<Language>(() => {
    const initial = typeof window === 'undefined' ? 'en' : readStored();
    applyDirection(initial);
    return initial;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode */
    }
    applyDirection(lang);
  }, []);

  const t = useCallback(
    (key: string, vars?: TranslateVars): string =>
      fill(TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key, vars),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      locale: localeTag(language),
      isArabic: language === 'ar',
    }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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
    'nav.essentials': 'Essentials',
    'nav.insight': 'Insight',
    'shell.search': 'Search',
    'shell.settings': 'Settings',
    'shell.signIn': 'Sign in',
    'shell.localOnly': 'Local only',
    'shell.thisDevice': 'This device',
    'shell.live': 'Live',
    'shell.cloudReady': 'Cloud ready',
    'shell.syncing': 'Syncing…',
    'shell.syncFailed': 'Sync failed',
    'shell.onThisDevice': 'On this device',
    'shell.account': 'Account',

    // Settings modal
    'settings.title': 'Settings',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.profile': 'Profile',
    'settings.storage': 'Storage',
    'settings.contact': 'Contact',
    'theme.light': 'Light',
    'theme.dark': 'Dark',

    // Team
    'team.create': 'Create team',
    'team.invite': 'Invite',

    // Contact (embedded in Settings)
    'contact.instagram': 'Message me on Instagram',

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
    'home.liveIn': 'Live in',
    'home.member': 'member',
    'home.members': 'members',
    'home.workingLocalOnly': 'Working on this device only — sign in to sync with your team.',
    'home.stat.openTasks': 'Open tasks',
    'home.stat.dueSoon': 'Due soon',
    'home.stat.teammates': 'Teammates',
    'home.stat.records': 'Records',
    'home.detail.nothingOverdue': 'Nothing overdue',
    'home.detail.overdue': 'overdue',
    'home.detail.dueTodayTomorrow': 'Due today or tomorrow',
    'home.detail.noTeamYet': 'No team yet',
    'home.detail.in': 'In',
    'home.detail.recordsAcross': 'Across notes, tasks, docs and more',
    'home.recentActivity': 'Recent activity',
    'home.nothingYet': 'Nothing yet — create something to see it here.',
    'home.jumpTo': 'Jump to',
    'home.link.saveit.label': 'SaveIt',
    'home.link.saveit.hint': 'Keep videos, articles and links',
    'home.link.tasks.label': 'Tasks',
    'home.link.tasks.hint': 'Prioritize and track work',
    'home.link.calendar.label': 'Calendar',
    'home.link.calendar.hint': 'See the schedule as a timeline',
    'home.link.team.label': 'Team',
    'home.link.team.hint': 'Members, roles and invites',
    'home.link.news.label': 'News',
    'home.link.news.hint': 'Pitch, draft and publish a story',
    'home.link.medications.label': 'Medications',
    'home.link.medications.hint': 'Track doses and treatment plans',
    'home.link.notebook.label': 'Notebook',
    'home.link.notebook.hint': 'Capture a quick note',
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
    'nav.essentials': 'الأساسيات',
    'nav.insight': 'الرؤى',
    'shell.search': 'بحث',
    'shell.settings': 'الإعدادات',
    'shell.signIn': 'تسجيل الدخول',
    'shell.localOnly': 'محلي فقط',
    'shell.thisDevice': 'هذا الجهاز',
    'shell.live': 'متصل',
    'shell.cloudReady': 'السحابة جاهزة',
    'shell.syncing': 'جارٍ المزامنة…',
    'shell.syncFailed': 'فشلت المزامنة',
    'shell.onThisDevice': 'على هذا الجهاز',
    'shell.account': 'الحساب',

    // Settings modal
    'settings.title': 'الإعدادات',
    'settings.theme': 'المظهر',
    'settings.language': 'اللغة',
    'settings.profile': 'الملف الشخصي',
    'settings.storage': 'التخزين',
    'settings.contact': 'تواصل',
    'theme.light': 'فاتح',
    'theme.dark': 'داكن',

    // Team
    'team.create': 'إنشاء فريق',
    'team.invite': 'دعوة',

    // Contact (embedded in Settings)
    'contact.instagram': 'راسلني على إنستغرام',

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
    'home.liveIn': 'متصل في',
    'home.member': 'عضو',
    'home.members': 'أعضاء',
    'home.workingLocalOnly': 'تعمل على هذا الجهاز فقط — سجّل الدخول للمزامنة مع فريقك.',
    'home.stat.openTasks': 'مهام مفتوحة',
    'home.stat.dueSoon': 'تستحق قريبًا',
    'home.stat.teammates': 'زملاء الفريق',
    'home.stat.records': 'السجلات',
    'home.detail.nothingOverdue': 'لا شيء متأخر',
    'home.detail.overdue': 'متأخر',
    'home.detail.dueTodayTomorrow': 'يستحق اليوم أو غدًا',
    'home.detail.noTeamYet': 'لا يوجد فريق بعد',
    'home.detail.in': 'في',
    'home.detail.recordsAcross': 'عبر الملاحظات والمهام والوثائق والمزيد',
    'home.recentActivity': 'النشاط الأخير',
    'home.nothingYet': 'لا شيء بعد — أنشئ شيئًا لتراه هنا.',
    'home.jumpTo': 'انتقل إلى',
    'home.link.saveit.label': 'المحفوظات',
    'home.link.saveit.hint': 'احفظ الفيديوهات والمقالات والروابط',
    'home.link.tasks.label': 'المهام',
    'home.link.tasks.hint': 'رتّب المهام وتابعها',
    'home.link.calendar.label': 'التقويم',
    'home.link.calendar.hint': 'اعرض الجدول كخط زمني',
    'home.link.team.label': 'الفريق',
    'home.link.team.hint': 'الأعضاء والأدوار والدعوات',
    'home.link.news.label': 'الأخبار',
    'home.link.news.hint': 'اقترح فكرة واكتب المقال وانشره',
    'home.link.medications.label': 'الأدوية',
    'home.link.medications.hint': 'تتبّع الجرعات وخطط العلاج',
    'home.link.notebook.label': 'دفتر الملاحظات',
    'home.link.notebook.hint': 'دوّن ملاحظة سريعة',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isArabic: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'heyfouad.language.v1';

function readStored(): Language {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'ar' || raw === 'en' ? raw : 'en';
  } catch {
    return 'en';
  }
}

function applyDirection(lang: Language): void {
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
    (key: string): string => {
      return TRANSLATIONS[language][key] ?? key;
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
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

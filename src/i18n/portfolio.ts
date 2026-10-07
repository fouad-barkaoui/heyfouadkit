import { defineDictionary } from './types';

/* "About the Founder" page — src/modules/portfolio. In `pf.bio.*` the <b>…</b> parts render bold. */
export default defineDictionary({
  en: {
    // Page header
    'pf.title': 'About the Founder',
    'pf.subtitle': 'The person behind Kanz: background, experience and stack.',

    // Cover + head
    'pf.cover.fig': 'Fig. 1.',
    'pf.cover.caption': 'Kanz, the treasure kept inside',
    'pf.theme.toDark.aria': 'Switch the whole app to dark theme',
    'pf.theme.toLight.aria': 'Switch the whole app to light theme',
    'pf.theme.toDark.title': 'Switch the whole app to dark',
    'pf.theme.toLight.title': 'Switch the whole app to light',
    'pf.portraitAlt': 'Portrait of Fouad Barkaoui',
    'pf.verified': 'Verified',

    // Rotating skills
    'pf.role.soc': 'Beginner SOC Analyst',
    'pf.role.fullstack': 'Fullstack Web Developer',
    'pf.role.programmer': 'Programmer',
    'pf.role.vibe': 'Vibe Coder',
    'pf.role.prompt': 'Prompt Engineer',
    'pf.role.solver': 'Problem Solver',
    'pf.role.analytical': 'Analytical Thinker',
    'pf.role.cyber': 'Cybersecurity Enthusiast',
    'pf.role.learner': 'Fast, Curious Learner',
    'pf.listSep': ', ',

    // Greeting (visitor's hour)
    'pf.greeting.morning': 'Good morning',
    'pf.greeting.afternoon': 'Good afternoon',
    'pf.greeting.evening': 'Good evening',

    // Bio
    'pf.bio.1': "I'm <b>Fouad Barkaoui</b>, a <b>beginner SOC analyst</b> and <b>fullstack web developer</b> from Morocco.",
    'pf.bio.2':
      'A <b>programmer</b>, <b>vibe coder</b> and <b>prompt engineer</b> who turns ideas into working products: fast, clean and <b>secure by default</b>.',
    'pf.bio.3':
      'My edge is <b>problem solving</b>: I break big, messy problems into small steps, stay curious, and keep learning how systems get built and how they get attacked.',
    'pf.writeToMe': 'Write to me',

    // Margin notes
    'pf.note.sayHi': 'say hi',
    'pf.note.basics': 'the basics',
    'pf.note.tools': 'my daily tools',
    'pf.note.building': "what I'm building",
    'pf.note.thanks': 'big thanks',
    'pf.note.worked': "where I've worked",
    'pf.note.milestones': 'milestones',
    'pf.note.findMe': 'find me here',

    // Section titles
    'pf.section.overview': 'Overview',
    'pf.section.experience': 'Experience',
    'pf.section.projects': 'Projects',
    'pf.section.stack': 'Stack',
    'pf.section.builtWith': 'Built with',
    'pf.section.socials': 'Socials',
    'pf.section.recognition': 'Recognition',

    // Overview rows
    'pf.ov.role': 'SOC analyst & fullstack developer',
    'pf.ov.craft': 'Vibe coder & prompt engineer',
    'pf.ov.country': 'Morocco',
    'pf.ov.inMorocco': ' in Morocco',
    'pf.ov.languages': 'Darija · Arabic · French · English',
    'pf.ov.emailCopied': 'Email copied',
    'pf.ov.copyEmail': 'Copy email address',
    'pf.ov.copiedToClipboard': 'Copied to clipboard',

    // Local time gap ("1h ahead", "4h 30m behind")
    'pf.gap.same': 'same time as you',
    'pf.gap.ahead': '{amount} ahead',
    'pf.gap.behind': '{amount} behind',
    'pf.gap.join': '{a} {b}',
    'pf.unit.hour.one': '1h',
    'pf.unit.hour.two': '2h',
    'pf.unit.hour.few': '{n}h',
    'pf.unit.hour.many': '{n}h',
    'pf.unit.minute.one': '1m',
    'pf.unit.minute.two': '2m',
    'pf.unit.minute.few': '{n}m',
    'pf.unit.minute.many': '{n}m',

    // Durations ("1m", "2y 7m")
    'pf.dur.join': '{a} {b}',
    'pf.unit.month.one': '1m',
    'pf.unit.month.two': '2m',
    'pf.unit.month.few': '{n}m',
    'pf.unit.month.many': '{n}m',
    'pf.unit.year.one': '1y',
    'pf.unit.year.two': '2y',
    'pf.unit.year.few': '{n}y',
    'pf.unit.year.many': '{n}y',
    'pf.present': 'present',

    // Stack
    'pf.stack.security': 'Security',
    'pf.stack.languages': 'Languages',
    'pf.stack.frontend': 'Frontend',
    'pf.stack.backend': 'Backend & data',
    'pf.stack.infra': 'Infra & tools',
    'pf.stack.cti': 'Threat intel (CTI)',

    // Projects
    'pf.proj.remote': 'Morocco (Remote)',
    'pf.proj.status.dev': 'In development',
    'pf.proj.status.live': 'Live',
    'pf.proj.kind.saas': 'Own SaaS',
    'pf.proj.kind.product': 'Own product',
    'pf.proj.tag.static': 'Static analysis',
    'pf.proj.tag.deps': 'Dependency scanning',
    'pf.proj.assas.title': 'Founder & Security Developer',
    'pf.proj.assas.p1': 'A SaaS that scans a full codebase for threats, bugs and violations of security rules.',
    'pf.proj.assas.p2':
      'Checks authentication, encryption, session handling, input validation, rate limiting and error handling.',
    'pf.proj.assas.p3':
      'Covers logging, backups, monitoring and dependency scanning, then reports every finding in one place.',
    'pf.proj.assas.p4': 'Monitors live targets with Firecrawl, crawling sites to catch new exposures as they appear.',
    'pf.proj.assas.p5': 'Built as a multi-tenant cloud service, one workspace per team.',
    'pf.proj.kanz.title': 'Founder & Fullstack Developer',
    'pf.proj.kanz.p1':
      'A private workspace that keeps notes, tasks, articles, courses, docs and analytics on one spatial canvas.',
    'pf.proj.kanz.p2': 'Works offline first and syncs through Supabase, with row-level security on every table.',
    'pf.proj.kanz.p3': 'Google sign-in, team invites and roles, and a private contact inbox.',
    'pf.proj.kanz.p4': 'Designed the brand end to end: the KANZ wordmark, the star icon and this page.',
    'pf.proj.tag.owasp': 'OWASP LLM Top 10',
    'pf.proj.tag.injection': 'Prompt injection',
    'pf.proj.pe.title': 'Founder & Developer',
    'pf.proj.pe.p1': 'Paste a prompt and a crawler reads it section by section: role, objective, context, rules, review and hand-off.',
    'pf.proj.pe.p2': 'Flags what is vague, risky or missing, word by word, using 11 quality rules and 26 security rules.',
    'pf.proj.pe.p3': 'Security rules follow my own detection taxonomy mapped to the OWASP LLM Top 10: injection, jailbreaks, leaked secrets and risky instructions.',
    'pf.proj.pe.p4': 'Gives a spec score, fixes ranked P1 to P3 and a rebuilt prompt you can crawl again until it scores 90+.',
    'pf.proj.pe.p5': 'Runs entirely in the browser, so no prompt leaves your machine. A Python tool measures each rule against a labeled test set.',

    // Socials
    'pf.social.resume.name': 'Resume',
    'pf.social.resume.handle': 'PDF · on its way',
    'pf.social.resume.note': 'My resume is coming soon.',
    'pf.social.github.name': 'GitHub',
    'pf.social.github.handle': 'fouad-barkaoui',
    'pf.social.github.note': 'Under construction. A brand-new account with repositories on the way.',
    'pf.social.linkedin.name': 'LinkedIn',
    'pf.social.linkedin.handle': 'fouad-barkaoui',
    'pf.social.linkedin.note': 'In development. The profile is still being put together.',
    'pf.social.instagram.name': 'Instagram',
    'pf.social.instagram.handle': '@heyfouad',
    'pf.social.facebook.name': 'Facebook',
    'pf.social.facebook.handle': 'Fouad Barkaoui',
    'pf.status.soon': 'Soon',
    'pf.status.building': 'Building',
    'pf.status.inProgress': 'In progress',

    // Coming soon panels
    'pf.soon.experience': 'Roles, internships and positions will be listed here.',
    'pf.soon.recognition': 'Certificates, awards and programs will be listed here.',

    // Motto
    'pf.motto.lead': 'Inspired by the fear of',
    'pf.motto.big': 'being average.',
  },
  ar: {
    // Page header
    'pf.title': 'عن المؤسس',
    'pf.subtitle': 'الشخص الذي يقف وراء كنز: المسار والخبرة والأدوات.',

    // Cover + head
    'pf.cover.fig': 'الشكل 1.',
    'pf.cover.caption': 'كنز، النفيس المحفوظ في الداخل',
    'pf.theme.toDark.aria': 'تبديل التطبيق بالكامل إلى المظهر الداكن',
    'pf.theme.toLight.aria': 'تبديل التطبيق بالكامل إلى المظهر الفاتح',
    'pf.theme.toDark.title': 'التبديل إلى المظهر الداكن',
    'pf.theme.toLight.title': 'التبديل إلى المظهر الفاتح',
    'pf.portraitAlt': 'صورة شخصية لفؤاد البركاوي',
    'pf.verified': 'موثّق',

    // Rotating skills
    'pf.role.soc': 'محلّل SOC مبتدئ',
    'pf.role.fullstack': 'مطوّر ويب متكامل',
    'pf.role.programmer': 'مبرمج',
    'pf.role.vibe': 'مبرمج بأسلوب Vibe Coding',
    'pf.role.prompt': 'مهندس أوامر الذكاء الاصطناعي',
    'pf.role.solver': 'بارع في حلّ المشكلات',
    'pf.role.analytical': 'مفكّر تحليلي',
    'pf.role.cyber': 'شغوف بالأمن السيبراني',
    'pf.role.learner': 'متعلّم سريع وفضولي',
    'pf.listSep': '، ',

    // Greeting (visitor's hour)
    'pf.greeting.morning': 'صباح الخير',
    'pf.greeting.afternoon': 'طاب يومك',
    'pf.greeting.evening': 'مساء الخير',

    // Bio
    'pf.bio.1': 'أنا <b>فؤاد البركاوي</b>، <b>محلّل SOC مبتدئ</b> و<b>مطوّر ويب متكامل</b> من المغرب.',
    'pf.bio.2':
      '<b>مبرمج</b> و<b>Vibe Coder</b> و<b>مهندس أوامر للذكاء الاصطناعي</b>، أحوّل الأفكار إلى منتجات تعمل فعلًا، بسرعة وإتقان، و<b>آمنة منذ البداية</b>.',
    'pf.bio.3':
      'نقطة قوّتي هي <b>حلّ المشكلات</b>: أفكّك المشكلات الكبيرة والمعقّدة إلى خطوات صغيرة، وأحافظ على فضولي، وأواصل تعلّم كيف تُبنى الأنظمة وكيف تتعرّض للهجوم.',
    'pf.writeToMe': 'راسلني',

    // Margin notes
    'pf.note.sayHi': 'قل مرحبًا',
    'pf.note.basics': 'الأساسيات',
    'pf.note.tools': 'أدواتي اليومية',
    'pf.note.building': 'ما أبنيه الآن',
    'pf.note.thanks': 'شكرًا جزيلًا',
    'pf.note.worked': 'أين عملت',
    'pf.note.milestones': 'محطّات',
    'pf.note.findMe': 'تجدني هنا',

    // Section titles
    'pf.section.overview': 'نظرة عامة',
    'pf.section.experience': 'الخبرة',
    'pf.section.projects': 'المشاريع',
    'pf.section.stack': 'الأدوات والتقنيات',
    'pf.section.builtWith': 'بُني باستخدام',
    'pf.section.socials': 'حساباتي',
    'pf.section.recognition': 'الشهادات والتقدير',

    // Overview rows
    'pf.ov.role': 'محلّل SOC ومطوّر ويب متكامل',
    'pf.ov.craft': 'مبرمج بأسلوب Vibe Coding ومهندس أوامر',
    'pf.ov.country': 'المغرب',
    'pf.ov.inMorocco': ' في المغرب',
    'pf.ov.languages': 'الدارجة · العربية · الفرنسية · الإنجليزية',
    'pf.ov.emailCopied': 'تم نسخ البريد الإلكتروني',
    'pf.ov.copyEmail': 'نسخ عنوان البريد الإلكتروني',
    'pf.ov.copiedToClipboard': 'تم النسخ إلى الحافظة',

    // Local time gap
    'pf.gap.same': 'نفس توقيتك',
    'pf.gap.ahead': 'متقدّم عنك بـ{amount}',
    'pf.gap.behind': 'متأخّر عنك بـ{amount}',
    'pf.gap.join': '{a} و{b}',
    'pf.unit.hour.one': 'ساعة',
    'pf.unit.hour.two': 'ساعتين',
    'pf.unit.hour.few': '{n} ساعات',
    'pf.unit.hour.many': '{n} ساعة',
    'pf.unit.minute.one': 'دقيقة',
    'pf.unit.minute.two': 'دقيقتين',
    'pf.unit.minute.few': '{n} دقائق',
    'pf.unit.minute.many': '{n} دقيقة',

    // Durations
    'pf.dur.join': '{a} و{b}',
    'pf.unit.month.one': 'شهر',
    'pf.unit.month.two': 'شهران',
    'pf.unit.month.few': '{n} أشهر',
    'pf.unit.month.many': '{n} شهرًا',
    'pf.unit.year.one': 'سنة',
    'pf.unit.year.two': 'سنتان',
    'pf.unit.year.few': '{n} سنوات',
    'pf.unit.year.many': '{n} سنة',
    'pf.present': 'حتى الآن',

    // Stack
    'pf.stack.security': 'الأمن',
    'pf.stack.languages': 'لغات البرمجة',
    'pf.stack.frontend': 'الواجهة الأمامية',
    'pf.stack.backend': 'الخلفية والبيانات',
    'pf.stack.infra': 'البنية التحتية والأدوات',
    'pf.stack.cti': 'استخبارات التهديدات (CTI)',

    // Projects
    'pf.proj.remote': 'المغرب (عن بُعد)',
    'pf.proj.status.dev': 'قيد التطوير',
    'pf.proj.status.live': 'متاح الآن',
    'pf.proj.kind.saas': 'منصة SaaS خاصة',
    'pf.proj.kind.product': 'منتج خاص',
    'pf.proj.tag.static': 'التحليل الثابت',
    'pf.proj.tag.deps': 'فحص الاعتماديات',
    'pf.proj.assas.title': 'المؤسس ومطوّر الأمن',
    'pf.proj.assas.p1': 'منصة SaaS تفحص قاعدة الشيفرة بالكامل بحثًا عن التهديدات والأخطاء ومخالفات قواعد الأمان.',
    'pf.proj.assas.p2':
      'تتحقّق من المصادقة والتشفير وإدارة الجلسات والتحقّق من المدخلات وتحديد معدّل الطلبات ومعالجة الأخطاء.',
    'pf.proj.assas.p3': 'تغطّي السجلات والنسخ الاحتياطي والمراقبة وفحص الاعتماديات، ثم تجمع كل النتائج في مكان واحد.',
    'pf.proj.assas.p4': 'تراقب الأهداف الحيّة عبر Firecrawl، فتزحف على المواقع لرصد أي نقاط انكشاف جديدة فور ظهورها.',
    'pf.proj.assas.p5': 'مبنيّة كخدمة سحابية متعدّدة المستأجرين، بمساحة عمل مستقلّة لكل فريق.',
    'pf.proj.kanz.title': 'المؤسس والمطوّر المتكامل',
    'pf.proj.kanz.p1':
      'مساحة عمل خاصة تجمع الملاحظات والمهام والمقالات والدورات والوثائق والتحليلات على لوحة مكانية واحدة.',
    'pf.proj.kanz.p2': 'تعمل دون اتصال أولًا وتتزامن عبر Supabase، مع أمان على مستوى الصفوف في كل جدول.',
    'pf.proj.kanz.p3': 'تسجيل الدخول عبر Google، ودعوات الفريق والأدوار، وصندوق رسائل خاص للتواصل.',
    'pf.proj.kanz.p4': 'صمّمت الهوية البصرية من البداية إلى النهاية: شعار KANZ الكتابي، وأيقونة النجمة، وهذه الصفحة.',
    'pf.proj.tag.owasp': 'OWASP LLM Top 10',
    'pf.proj.tag.injection': 'حقن الأوامر',
    'pf.proj.pe.title': 'المؤسس والمطوّر',
    'pf.proj.pe.p1': 'الصق أمرًا (prompt) فيقرؤه زاحف قسمًا قسمًا: الدور، والهدف، والسياق، والقواعد، والمراجعة، والتسليم.',
    'pf.proj.pe.p2': 'يرصد كلمةً بكلمة ما هو غامض أو خطِر أو ناقص، عبر 11 قاعدة للجودة و26 قاعدة للأمان.',
    'pf.proj.pe.p3': 'قواعد الأمان مبنيّة على تصنيف كشفٍ وضعته بنفسي ومربوط بقائمة OWASP LLM Top 10: الحقن، وكسر القيود، وتسريب الأسرار، والتعليمات الخطِرة.',
    'pf.proj.pe.p4': 'يعطي درجة للمواصفات، وإصلاحات مرتّبة من P1 إلى P3، وأمرًا مُعاد بناؤه تُعيد فحصه حتى يتجاوز 90.',
    'pf.proj.pe.p5': 'يعمل كليًا داخل المتصفح، فلا يغادر أي أمر جهازك. وتقيس أداة Python كل قاعدة على مجموعة اختبار موسومة.',

    // Socials
    'pf.social.resume.name': 'السيرة الذاتية',
    'pf.social.resume.handle': 'PDF · في الطريق',
    'pf.social.resume.note': 'سيرتي الذاتية ستكون متاحة قريبًا.',
    'pf.social.github.name': 'GitHub',
    'pf.social.github.handle': 'fouad-barkaoui',
    'pf.social.github.note': 'قيد الإنشاء. حساب جديد كليًا، والمستودعات في الطريق.',
    'pf.social.linkedin.name': 'LinkedIn',
    'pf.social.linkedin.handle': 'fouad-barkaoui',
    'pf.social.linkedin.note': 'قيد التطوير. ما زلت أجهّز الملف الشخصي.',
    'pf.social.instagram.name': 'Instagram',
    'pf.social.instagram.handle': '@heyfouad',
    'pf.social.facebook.name': 'Facebook',
    'pf.social.facebook.handle': 'فؤاد البركاوي',
    'pf.status.soon': 'قريبًا',
    'pf.status.building': 'قيد البناء',
    'pf.status.inProgress': 'قيد الإعداد',

    // Coming soon panels
    'pf.soon.experience': 'ستُدرَج هنا الوظائف والتدريبات والمناصب.',
    'pf.soon.recognition': 'ستُدرَج هنا الشهادات والجوائز والبرامج.',

    // Motto
    'pf.motto.lead': 'يُلهمني الخوف من أن أكون',
    'pf.motto.big': 'شخصًا عاديًا.',
  },
});

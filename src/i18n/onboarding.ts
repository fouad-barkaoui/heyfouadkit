import { defineDictionary } from './types';

export default defineDictionary({
  en: {
    // Consent sheet (shared)
    'ob.cancel': 'Cancel',
    'ob.close': 'Close',
    'ob.hideDetails': 'Hide details',
    'ob.readDetails': 'Read the details',
    'ob.allSet': 'All set',
    'ob.decline': 'Decline',

    // Cookie / local storage notice
    'ob.cookie.partner': 'THIS DEVICE',
    'ob.cookie.title': 'Keep Your Workspace',
    'ob.cookie.body': 'Kanz saves your work in this browser, so everything is exactly how you left it next time.',
    'ob.cookie.boxBefore': 'By continuing, you accept that Kanz ',
    'ob.cookie.boxLink': 'stores your data locally',
    'ob.cookie.boxAfter': ' in this browser and reuses it on your next visit.',
    'ob.cookie.details':
      'Notes, tasks, docs and preferences live in this browser’s local storage — and, if you sign in, in your own private cloud copy. Nothing is used for tracking or ads. Declining only hides this notice; the app still needs local storage to remember your work.',
    'ob.cookie.accept': 'Accept and Continue',

    // Cloud terms
    'ob.cloud.partner': 'CLOUD',
    'ob.cloud.title': 'Turn On Cloud Sync',
    'ob.cloud.body':
      'Kanz uses a private cloud for your library, so your notes, tasks and files are on every device right away.',
    'ob.cloud.boxBefore': 'By continuing, you accept ',
    'ob.cloud.boxLink': 'Kanz’s terms of use',
    'ob.cloud.boxAfter': ' and agree to your cloud storage being limited to {total}, with each file up to {each}.',
    'ob.cloud.accept': 'Accept Terms and Continue',
    'ob.cloud.rule.private.title': 'This space is only yours',
    'ob.cloud.rule.private.body':
      'Row-level security in the database enforces it — nobody else can read or write your rows or files.',
    'ob.cloud.rule.storage.title': 'Storage is limited to {total}',
    'ob.cloud.rule.storage.body':
      'Each file can be up to {each}. Once you reach the total, remove something before adding more.',
    'ob.cloud.rule.control.title': 'You are always in control',
    'ob.cloud.rule.control.body':
      'Back up, restore, or wipe your cloud copy any time from the Account panel. Signing out never deletes this device’s copy.',

    // What's new
    'ob.wn.kicker': "What's new",
    'ob.wn.title': "Here's what we just added to Kanz",
    'ob.wn.soon': 'Soon',
    'ob.wn.new': 'New',
    'ob.wn.inDev': 'In development',
    'ob.wn.next': 'Next',
    'ob.wn.gotIt': 'Got it',
    'ob.wn.art.save': 'Save',
    'ob.wn.art.admin': 'ADMIN',
    'ob.wn.art.building': 'Building…',
    'ob.wn.saveit.label': 'SaveIt',
    'ob.wn.saveit.title': 'Save anything worth coming back to',
    'ob.wn.saveit.body':
      'Paste a link — a video, an article, a repo, any website — and it becomes a rich card with its picture, title and reading time. Videos play right inside the app. Share links from your phone, or save any page with one click from your bookmarks bar.',
    'ob.wn.saveit.action': 'Open SaveIt',
    'ob.wn.constellation.label': 'Constellation view',
    'ob.wn.constellation.title': 'See your library as a galaxy',
    'ob.wn.constellation.body':
      'Switch SaveIt to Constellation and every link becomes a star, grouped by type, with threads joining the ones that share a tag. Drag to orbit, scroll to zoom, click a star to open it.',
    'ob.wn.constellation.action': 'Explore it',
    'ob.wn.profile.label': 'Profile pictures',
    'ob.wn.profile.title': 'Make your profile yours',
    'ob.wn.profile.body':
      'Add a profile picture — crop it right in the app — and it follows you everywhere: the sidebar, your home page and your team. Pro members get the gold spotlight badge.',
    'ob.wn.profile.action': 'Add my picture',
    'ob.wn.team.label': 'Team',
    'ob.wn.team.title': 'Teams are on the way',
    'ob.wn.team.body':
      "Invite people, share a workspace and edit together live. We're still building this — it's marked “Soon” in the sidebar and will light up here as soon as it's ready.",
  },
  ar: {
    'ob.cancel': 'إلغاء',
    'ob.close': 'إغلاق',
    'ob.hideDetails': 'إخفاء التفاصيل',
    'ob.readDetails': 'اقرأ التفاصيل',
    'ob.allSet': 'تم',
    'ob.decline': 'رفض',

    'ob.cookie.partner': 'هذا الجهاز',
    'ob.cookie.title': 'احتفظ بمساحة عملك',
    'ob.cookie.body': 'يحفظ كنز عملك في هذا المتصفح، لتجد كل شيء كما تركته في المرة القادمة.',
    'ob.cookie.boxBefore': 'بالمتابعة، أنت توافق على أن كنز ',
    'ob.cookie.boxLink': 'يحفظ بياناتك محليًا',
    'ob.cookie.boxAfter': ' في هذا المتصفح ويستخدمها في زيارتك القادمة.',
    'ob.cookie.details':
      'تُحفظ الملاحظات والمهام والوثائق والتفضيلات في التخزين المحلي لهذا المتصفح — وفي نسختك السحابية الخاصة إذا سجّلت الدخول. لا يُستخدم شيء منها للتتبع أو الإعلانات. الرفض يخفي هذا الإشعار فقط؛ فالتطبيق يحتاج إلى التخزين المحلي ليتذكر عملك.',
    'ob.cookie.accept': 'موافق ومتابعة',

    'ob.cloud.partner': 'السحابة',
    'ob.cloud.title': 'تفعيل المزامنة السحابية',
    'ob.cloud.body': 'يستخدم كنز سحابة خاصة لمكتبتك، لتكون ملاحظاتك ومهامك وملفاتك على كل أجهزتك فورًا.',
    'ob.cloud.boxBefore': 'بالمتابعة، أنت توافق على ',
    'ob.cloud.boxLink': 'شروط استخدام كنز',
    'ob.cloud.boxAfter': ' وعلى أن تكون مساحة تخزينك السحابية محدودة بـ {total}، وألا يتجاوز كل ملف {each}.',
    'ob.cloud.accept': 'قبول الشروط والمتابعة',
    'ob.cloud.rule.private.title': 'هذه المساحة لك وحدك',
    'ob.cloud.rule.private.body': 'يفرض ذلك أمانٌ على مستوى الصفوف في قاعدة البيانات — لا أحد غيرك يستطيع قراءة بياناتك أو ملفاتك أو تعديلها.',
    'ob.cloud.rule.storage.title': 'مساحة التخزين محدودة بـ {total}',
    'ob.cloud.rule.storage.body': 'يمكن أن يصل حجم كل ملف إلى {each}. عند بلوغ الحد الإجمالي، احذف شيئًا قبل إضافة المزيد.',
    'ob.cloud.rule.control.title': 'التحكم بيدك دائمًا',
    'ob.cloud.rule.control.body':
      'انسخ نسختك السحابية احتياطيًا أو استعِدها أو امسحها في أي وقت من لوحة الحساب. تسجيل الخروج لا يحذف أبدًا النسخة الموجودة على هذا الجهاز.',

    'ob.wn.kicker': 'الجديد',
    'ob.wn.title': 'إليك ما أضفناه مؤخرًا إلى كنز',
    'ob.wn.soon': 'قريبًا',
    'ob.wn.new': 'جديد',
    'ob.wn.inDev': 'قيد التطوير',
    'ob.wn.next': 'التالي',
    'ob.wn.gotIt': 'فهمت',
    'ob.wn.art.save': 'حفظ',
    'ob.wn.art.admin': 'مسؤول',
    'ob.wn.art.building': 'قيد البناء…',
    'ob.wn.saveit.label': 'المحفوظات',
    'ob.wn.saveit.title': 'احفظ كل ما يستحق العودة إليه',
    'ob.wn.saveit.body':
      'الصق رابطًا — فيديو أو مقالًا أو مستودعًا أو أي موقع — ليتحول إلى بطاقة غنية بصورته وعنوانه ومدة قراءته. تُشغَّل الفيديوهات داخل التطبيق مباشرة. شارك الروابط من هاتفك، أو احفظ أي صفحة بنقرة واحدة من شريط الإشارات المرجعية.',
    'ob.wn.saveit.action': 'فتح المحفوظات',
    'ob.wn.constellation.label': 'عرض الكوكبة',
    'ob.wn.constellation.title': 'شاهد مكتبتك كمجرّة',
    'ob.wn.constellation.body':
      'بدّل المحفوظات إلى عرض الكوكبة ليصبح كل رابط نجمة، مجمّعة حسب النوع، مع خيوط تربط ما يشترك في وسم واحد. اسحب للدوران، ومرّر للتكبير، وانقر على نجمة لفتحها.',
    'ob.wn.constellation.action': 'استكشفه',
    'ob.wn.profile.label': 'الصور الشخصية',
    'ob.wn.profile.title': 'اجعل ملفك الشخصي يشبهك',
    'ob.wn.profile.body':
      'أضف صورة شخصية — واقتصّها داخل التطبيق — لترافقك في كل مكان: الشريط الجانبي وصفحتك الرئيسية وفريقك. يحصل أعضاء Pro على شارة الواجهة الذهبية.',
    'ob.wn.profile.action': 'إضافة صورتي',
    'ob.wn.team.label': 'الفريق',
    'ob.wn.team.title': 'الفرق في الطريق',
    'ob.wn.team.body':
      'ادعُ الآخرين وشارك مساحة عمل وحرّروا معًا مباشرة. ما زلنا نبني هذه الميزة — وهي معلّمة بـ «قريبًا» في الشريط الجانبي وستُفعَّل هنا فور جاهزيتها.',
  },
});

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

  },
});

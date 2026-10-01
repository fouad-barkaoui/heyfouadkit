import { defineDictionary } from './types';

/* Shared trash.* keys (title, restore, empty states…) live in languageStore.tsx. */
export default defineDictionary({
  en: {
    'trash.untitled.note': 'Untitled note',
    'trash.untitled.task': 'Untitled task',
    'trash.untitled.article': 'Untitled article',
    'trash.untitled.document': 'Untitled document',
    'trash.untitled.course': 'Untitled course',
    'trash.untitled.story': 'Untitled story',
    'trash.untitled.medicine': 'Untitled medicine',
    'trash.untitled.plan': 'Untitled plan',
    'trash.checkins': '{count} check-ins',
    'trash.steps': '{count} steps',
    'trash.restoreItem': 'Restore item',
    'trash.ago.now': 'just now',
    'trash.ago.minutes': '{count}m ago',
    'trash.ago.hours': '{count}h ago',
    'trash.ago.days': '{count}d ago',
  },
  ar: {
    'trash.untitled.note': 'ملاحظة بلا عنوان',
    'trash.untitled.task': 'مهمة بلا عنوان',
    'trash.untitled.article': 'مقال بلا عنوان',
    'trash.untitled.document': 'وثيقة بلا عنوان',
    'trash.untitled.course': 'دورة بلا عنوان',
    'trash.untitled.story': 'خبر بلا عنوان',
    'trash.untitled.medicine': 'دواء بلا اسم',
    'trash.untitled.plan': 'خطة بلا عنوان',
    'trash.checkins': 'التسجيلات: {count}',
    'trash.steps': 'الخطوات: {count}',
    'trash.restoreItem': 'استعادة العنصر',
    'trash.ago.now': 'الآن',
    'trash.ago.minutes': 'منذ {count} د',
    'trash.ago.hours': 'منذ {count} س',
    'trash.ago.days': 'منذ {count} يوم',
  },
});

import { defineDictionary } from './types';

export default defineDictionary({
  en: {
    // Roles
    'team2.role.owner': 'Owner',
    'team2.role.admin': 'Admin',
    'team2.role.editor': 'Editor',
    'team2.role.viewer': 'Viewer',
    'team2.roleLower.owner': 'owner',
    'team2.roleLower.admin': 'admin',
    'team2.roleLower.editor': 'editor',
    'team2.roleLower.viewer': 'viewer',
    'team2.roleHint.owner': 'Full control, including deleting the team',
    'team2.roleHint.admin': 'Manage members, roles and invites',
    'team2.roleHint.editor': 'Create and edit everything',
    'team2.roleHint.viewer': 'Read-only access',

    // Common
    'team2.cancel': 'Cancel',
    'team2.done': 'Done',
    'team2.save': 'Save',
    'team2.saving': 'Saving…',
    'team2.teamName': 'Team name',
    'team2.nameTooShort': 'Give the team a name of at least 2 characters.',
    'team2.noTeamSelected': 'No team selected',
    'team2.noTeamSelectedErr': 'No team selected.',
    'team2.genericDone': 'Done.',
    'team2.genericError': 'Something went wrong.',

    // Create team
    'team2.createTitle': 'Create a team',
    'team2.inviteMembers': 'Invite members',
    'team2.createDesc': "You'll be the owner. Invite people once it's created.",
    'team2.shareDesc': 'Share the invite link with your team members.',
    'team2.creating': 'Creating...',
    'team2.namePlaceholder': 'Acme Product Team',
    'team2.ready': 'Team “{name}” is ready, and it\'s now your active team.',
    'team2.useInviteBefore': 'Use ',
    'team2.useInviteAfter': ' at the top of the team page to add people.',

    // Invite
    'team2.inviteTitle': 'Invite to the team',
    'team2.inviteDesc': 'Anyone with this link can join with the role you pick — good for 7 days.',
    'team2.generating': 'Generating...',
    'team2.generateLink': 'Generate link',
    'team2.joinRole': 'Role for people who join',
    'team2.inviteLink': 'Invite link',
    'team2.copyLink': 'Copy invite link',
    'team2.joinsAsShare': 'Joins as {role}. Share it however you like.',

    // Rename / delete
    'team2.renameTitle': 'Rename team',
    'team2.deleteTitle': 'Delete team',
    'team2.deleteDesc':
      'This permanently deletes the team and everything in it — notes, tasks, docs, links, habits and files — for every member.',
    'team2.deleting': 'Deleting…',
    'team2.deleteForever': 'Delete forever',
    'team2.typeBefore': 'Type ',
    'team2.typeAfter': ' to confirm',

    // Signed out
    'team2.signInTitle': 'Sign in to use teams',
    'team2.signInHint': 'Team collaboration is shared across signed-in members — sign in first.',

    // Team list
    'team2.yourTeams': 'Your teams',
    'team2.new': 'New',
    'team2.loadingTeams': 'Loading teams…',
    'team2.noTeams': 'No teams yet — create one.',
    'team2.active': 'Active',
    'team2.allTeams': 'All teams ({count})',

    // Header
    'team2.members.one': '{count} member',
    'team2.members': '{count} members',
    'team2.openInvites.one': ' · {count} open invite',
    'team2.openInvites': ' · {count} open invites',
    'team2.youAre': " · you're {role}",
    'team2.leave': 'Leave',
    'team2.leaveConfirm': "Leave “{name}”? You'll lose access to its notes, tasks and files.",
    'team2.left': 'You left {name}.',

    // Body
    'team2.stillGrowing': 'Still growing',
    'team2.stillGrowingBody':
      ' — create, rename and delete teams, invite people, change roles, remove members and cancel invites all work. Shared editing extras are on the way.',
    'team2.membersHeading': 'Members',
    'team2.loadingMembers': 'Loading members…',
    'team2.noMembers': 'No members yet.',
    'team2.member': 'Member',
    'team2.you': '(you)',
    'team2.joined': 'joined {when}',
    'team2.roleFor': 'Role for {name}',
    'team2.nowRole': '{name} is now {role}.',
    'team2.removed': '{name} was removed.',
    'team2.remove': 'Remove {name}',
    'team2.openInvitesHeading': 'Open invites',
    'team2.noOpenInvites': 'No open invites. Use Invite to create a link.',
    'team2.joinsAs': 'Joins as ',
    'team2.inviteMeta': '{used} used · created {date}',
    'team2.expires': ' · expires {date}',
    'team2.cancelInvite': 'Cancel invite',
    'team2.inviteCancelled': 'Invite cancelled — the link no longer works.',
    'team2.deleted': '“{name}” was deleted.',
    'team2.renamed': 'Team renamed.',

    // Relative time
    'team2.justNow': 'just now',
    'team2.minsAgo': '{count}m ago',
    'team2.hoursAgo': '{count}h ago',
    'team2.daysAgo': '{count}d ago',
  },
  ar: {
    // Roles
    'team2.role.owner': 'المالك',
    'team2.role.admin': 'مسؤول',
    'team2.role.editor': 'محرر',
    'team2.role.viewer': 'مشاهد',
    'team2.roleLower.owner': 'المالك',
    'team2.roleLower.admin': 'مسؤول',
    'team2.roleLower.editor': 'محرر',
    'team2.roleLower.viewer': 'مشاهد',
    'team2.roleHint.owner': 'تحكم كامل، بما في ذلك حذف الفريق',
    'team2.roleHint.admin': 'إدارة الأعضاء والأدوار والدعوات',
    'team2.roleHint.editor': 'إنشاء وتعديل كل شيء',
    'team2.roleHint.viewer': 'قراءة فقط',

    // Common
    'team2.cancel': 'إلغاء',
    'team2.done': 'تم',
    'team2.save': 'حفظ',
    'team2.saving': 'جارٍ الحفظ…',
    'team2.teamName': 'اسم الفريق',
    'team2.nameTooShort': 'أعطِ الفريق اسمًا من حرفين على الأقل.',
    'team2.noTeamSelected': 'لم يتم اختيار فريق',
    'team2.noTeamSelectedErr': 'لم يتم اختيار فريق.',
    'team2.genericDone': 'تم.',
    'team2.genericError': 'حدث خطأ ما.',

    // Create team
    'team2.createTitle': 'إنشاء فريق',
    'team2.inviteMembers': 'دعوة الأعضاء',
    'team2.createDesc': 'ستكون أنت المالك. ادعُ الأشخاص بعد إنشائه.',
    'team2.shareDesc': 'شارك رابط الدعوة مع أعضاء فريقك.',
    'team2.creating': 'جارٍ الإنشاء...',
    'team2.namePlaceholder': 'فريق منتج أكمي',
    'team2.ready': 'الفريق «{name}» جاهز، وهو الآن فريقك النشط.',
    'team2.useInviteBefore': 'استخدم زر ',
    'team2.useInviteAfter': ' في أعلى صفحة الفريق لإضافة أشخاص.',

    // Invite
    'team2.inviteTitle': 'الدعوة إلى الفريق',
    'team2.inviteDesc': 'يمكن لأي شخص لديه هذا الرابط الانضمام بالدور الذي تختاره — صالح لمدة 7 أيام.',
    'team2.generating': 'جارٍ الإنشاء...',
    'team2.generateLink': 'إنشاء رابط',
    'team2.joinRole': 'دور المنضمين',
    'team2.inviteLink': 'رابط الدعوة',
    'team2.copyLink': 'نسخ رابط الدعوة',
    'team2.joinsAsShare': 'ينضم بدور {role}. شاركه كما تشاء.',

    // Rename / delete
    'team2.renameTitle': 'إعادة تسمية الفريق',
    'team2.deleteTitle': 'حذف الفريق',
    'team2.deleteDesc':
      'سيُحذف الفريق نهائيًا مع كل ما فيه — الملاحظات والمهام والمستندات والروابط والعادات والملفات — لجميع الأعضاء.',
    'team2.deleting': 'جارٍ الحذف…',
    'team2.deleteForever': 'حذف نهائي',
    'team2.typeBefore': 'اكتب ',
    'team2.typeAfter': ' للتأكيد',

    // Signed out
    'team2.signInTitle': 'سجّل الدخول لاستخدام الفرق',
    'team2.signInHint': 'التعاون في الفريق متاح للأعضاء المسجلين — سجّل الدخول أولًا.',

    // Team list
    'team2.yourTeams': 'فرقك',
    'team2.new': 'جديد',
    'team2.loadingTeams': 'جارٍ تحميل الفرق…',
    'team2.noTeams': 'لا توجد فرق بعد — أنشئ واحدًا.',
    'team2.active': 'نشط',
    'team2.allTeams': 'كل الفرق ({count})',

    // Header
    'team2.members.one': '{count} عضو',
    'team2.members': '{count} أعضاء',
    'team2.openInvites.one': ' · {count} دعوة مفتوحة',
    'team2.openInvites': ' · {count} دعوات مفتوحة',
    'team2.youAre': ' · دورك: {role}',
    'team2.leave': 'مغادرة',
    'team2.leaveConfirm': 'مغادرة «{name}»؟ ستفقد الوصول إلى ملاحظاته ومهامه وملفاته.',
    'team2.left': 'غادرت {name}.',

    // Body
    'team2.stillGrowing': 'قيد التطوير',
    'team2.stillGrowingBody':
      ' — إنشاء الفرق وإعادة تسميتها وحذفها، ودعوة الأشخاص، وتغيير الأدوار، وإزالة الأعضاء، وإلغاء الدعوات، كلها تعمل. ميزات التحرير المشترك الإضافية قادمة.',
    'team2.membersHeading': 'الأعضاء',
    'team2.loadingMembers': 'جارٍ تحميل الأعضاء…',
    'team2.noMembers': 'لا يوجد أعضاء بعد.',
    'team2.member': 'عضو',
    'team2.you': '(أنت)',
    'team2.joined': 'انضم {when}',
    'team2.roleFor': 'دور {name}',
    'team2.nowRole': 'أصبح {name} بدور {role}.',
    'team2.removed': 'تمت إزالة {name}.',
    'team2.remove': 'إزالة {name}',
    'team2.openInvitesHeading': 'الدعوات المفتوحة',
    'team2.noOpenInvites': 'لا توجد دعوات مفتوحة. استخدم «دعوة» لإنشاء رابط.',
    'team2.joinsAs': 'ينضم بدور ',
    'team2.inviteMeta': 'استُخدمت {used} مرة · أُنشئت {date}',
    'team2.expires': ' · تنتهي {date}',
    'team2.cancelInvite': 'إلغاء الدعوة',
    'team2.inviteCancelled': 'أُلغيت الدعوة — لم يعد الرابط يعمل.',
    'team2.deleted': 'تم حذف «{name}».',
    'team2.renamed': 'تمت إعادة تسمية الفريق.',

    // Relative time
    'team2.justNow': 'الآن',
    'team2.minsAgo': 'منذ {count} د',
    'team2.hoursAgo': 'منذ {count} س',
    'team2.daysAgo': 'منذ {count} يوم',
  },
});

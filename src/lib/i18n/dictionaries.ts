export type Lang = "ar" | "en";

export type Dictionary = {
  teachers: string;
  dashboard: string;
  signIn: string;
  signOut: string;
  footerTag: string;
  loginTitle: string;
  username: string;
  password: string;
  parentRegister: string;
  studentRegister: string;
  forgotPassword: string;
  fullName: string;
  emailOptional: string;
  createStudent: string;
  createParent: string;
  parentHelp: string;
  linkChildHelp: string;
  studentUsername: string;
  linkChild: string;
  lessonChat: string;
  lessonChatHelpStudent: string;
  lessonChatHelpTeacher: string;
  openChat: string;
  chatUnlock: string;
  myLessons: string;
  browseTeachers: string;
  language: string;
  heroHeadline: string;
  heroSub: string;
  meetTeachers: string;
  howItWorks: string;
  howItWorksSub: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  ourTeachers: string;
  ourTeachersSub: string;
  viewAll: string;
  teachersPageSub: string;
  parentTitle: string;
  linkStudentAccount: string;
  children: string;
  noChildren: string;
  noBookings: string;
  back: string;
  chatWith: string;
  typeMessage: string;
  send: string;
  holdToSpeak: string;
  listening: string;
  micHintStudent: string;
  micHintTeacher: string;
  micHintBoth: string;
  paneLeftEmpty: string;
  paneRightEmpty: string;
  resetPassword: string;
  email: string;
  sendResetLink: string;
  newPassword: string;
  confirmPassword: string;
  savePassword: string;
};

export const dictionaries: Record<Lang, Dictionary> = {
  ar: {
    teachers: "المعلمون",
    dashboard: "لوحة التحكم",
    signIn: "دخول",
    signOut: "خروج",
    footerTag: "معلمون مصريون · طلاب حول العالم · دفع عبر الأكاديمية",
    loginTitle: "تسجيل الدخول",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    parentRegister: "تسجيل ولي أمر",
    studentRegister: "تسجيل طالب",
    forgotPassword: "نسيت كلمة المرور؟",
    fullName: "الاسم الكامل",
    emailOptional: "البريد (اختياري)",
    createStudent: "إنشاء حساب طالب",
    createParent: "إنشاء حساب ولي أمر",
    parentHelp:
      "ولي الأمر يتابع حجوزات الابن فقط. الابن يحتاج حساب طالب منفصل (يوزرنيم وباسورد).",
    linkChildHelp: "اربط حساب ابنك باستخدام يوزرنيم الطالب.",
    studentUsername: "يوزرنيم الطالب",
    linkChild: "ربط الابن",
    lessonChat: "شات الدرس",
    lessonChatHelpStudent:
      "تكلم عربي أو إنجليزي — الترجمة تظهر للطرفين في العمودين تلقائياً.",
    lessonChatHelpTeacher:
      "تكلم عربي أو إنجليزي — الترجمة تظهر للطرفين في العمودين تلقائياً.",
    openChat: "فتح الشات",
    chatUnlock: "الشات يُفتح بعد حجز درس مع المعلم (الدفع غير مطلوب).",
    myLessons: "دروسي",
    browseTeachers: "تصفح المعلمين",
    language: "اللغة",
    heroHeadline: "القرآن وعلومه، من معلمين مصريين لطلاب في الخارج.",
    heroSub:
      "حفظ وتجويد وعربية أونلاين — لطلاب أمريكا وأوروبا. احجز ساعة وادفع بالبطاقة أو عبر الأكاديمية.",
    meetTeachers: "تعرّف على معلمينا",
    howItWorks: "كيف يعمل",
    howItWorksSub: "حجز بسيط للطلاب الدوليين — الحساب يُفتح بعد تأكيد الدفع.",
    step1Title: "اختر معلماً",
    step1Body: "تصفح الشيوخ المصريين، افتح البروفايل، وتعرّف على كل معلم.",
    step2Title: "اطلب موعداً",
    step2Body: "احجز كزائر بالهاتف وواتساب. نحجز الساعة لمدة ٢٤ ساعة.",
    step3Title: "ادفع وتعلّم",
    step3Body:
      "ادفع بالبطاقة أو واتساب الأكاديمية. يُقفل المربع في التقويم، يُفتح حسابك، ويُبلَّغ المعلم.",
    ourTeachers: "معلمونا",
    ourTeachersSub:
      "اضغط بطاقة الشيخ لفتح بروفايله — نبذة، فيديو، صوت، والحجز.",
    viewAll: "عرض الكل",
    teachersPageSub:
      "اضغط بطاقة المعلم لفتح البروفايل — نبذة، فيديو، صوت، وحجز درس.",
    parentTitle: "لوحة ولي الأمر",
    linkStudentAccount: "ربط حساب طالب",
    children: "الأبناء",
    noChildren: "لا أبناء مربوطين بعد.",
    noBookings: "لا حجوزات.",
    back: "رجوع",
    chatWith: "محادثة مع",
    typeMessage: "اكتب رسالة…",
    send: "إرسال",
    holdToSpeak: "اضغط للتحدث",
    listening: "يستمع…",
    micHintStudent:
      "تكلم عربي أو إنجليزي — الترجمة تظهر للطرفين في العمودين.",
    micHintTeacher:
      "تكلم عربي أو إنجليزي — الترجمة تظهر للطرفين في العمودين.",
    micHintBoth:
      "تكلم عربي أو إنجليزي من هذه الصفحة — يسار: إنجليزي→عربي · يمين: عربي→إنجليزي (يظهر عند الطرفين).",
    paneLeftEmpty: "الكلام الإنجليزي يظهر هنا مترجماً للعربية",
    paneRightEmpty: "الكلام العربي يظهر هنا مترجماً للإنجليزية",
    resetPassword: "إعادة تعيين كلمة المرور",
    email: "البريد الإلكتروني",
    sendResetLink: "إرسال رابط الاسترجاع",
    newPassword: "كلمة مرور جديدة",
    confirmPassword: "تأكيد كلمة المرور",
    savePassword: "حفظ كلمة المرور",
  },
  en: {
    teachers: "Teachers",
    dashboard: "Dashboard",
    signIn: "Sign in",
    signOut: "Sign out",
    footerTag: "Egyptian teachers · Students worldwide · Academy payment",
    loginTitle: "Sign in",
    username: "Username",
    password: "Password",
    parentRegister: "Parent register",
    studentRegister: "Student register",
    forgotPassword: "Forgot password?",
    fullName: "Full name",
    emailOptional: "Email (optional)",
    createStudent: "Create student account",
    createParent: "Create parent account",
    parentHelp:
      "Parents only follow a child’s bookings. The child needs a separate student account (username + password).",
    linkChildHelp: "Link your child’s student account by username.",
    studentUsername: "Student username",
    linkChild: "Link child",
    lessonChat: "Lesson chat",
    lessonChatHelpStudent:
      "Speak Arabic or English — translations appear for both sides in both columns.",
    lessonChatHelpTeacher:
      "Speak Arabic or English — translations appear for both sides in both columns.",
    openChat: "Open chat",
    chatUnlock: "Chat unlocks after you book a lesson (payment not required).",
    myLessons: "My lessons",
    browseTeachers: "Browse teachers",
    language: "Language",
    heroHeadline:
      "Quran & its sciences, taught by Egyptian teachers to students abroad.",
    heroSub:
      "Live online Hifz, Tajweed, and Arabic — for learners in America and Europe. Book a one-hour lesson; pay by card or via the academy.",
    meetTeachers: "Meet our teachers",
    howItWorks: "How it works",
    howItWorksSub:
      "Simple booking for international students — no account until payment is confirmed.",
    step1Title: "Choose a teacher",
    step1Body:
      "Browse Egyptian tutors, open a profile, and learn about each sheikh.",
    step2Title: "Request a slot",
    step2Body:
      "Book as a guest with phone & WhatsApp. We hold the hour for 24h.",
    step3Title: "Pay & learn",
    step3Body:
      "Pay by card (or academy WhatsApp). The calendar square locks, your account opens, and the teacher is notified.",
    ourTeachers: "Our teachers",
    ourTeachersSub:
      "Click a sheikh card to open his profile — about, videos, audio, and calendar booking.",
    viewAll: "View all",
    teachersPageSub:
      "Click a teacher card to open their profile — about, videos, audio, and book a lesson.",
    parentTitle: "Parent dashboard",
    linkStudentAccount: "Link student account",
    children: "Children",
    noChildren: "No linked children yet.",
    noBookings: "No bookings.",
    back: "Back",
    chatWith: "Chat with",
    typeMessage: "Type a message…",
    send: "Send",
    holdToSpeak: "Tap to speak",
    listening: "Listening…",
    micHintStudent:
      "Speak Arabic or English — translations show for both people in both columns.",
    micHintTeacher:
      "Speak Arabic or English — translations show for both people in both columns.",
    micHintBoth:
      "Speak Arabic or English on this page — left: EN→AR · right: AR→EN (visible to both sides).",
    paneLeftEmpty: "English speech appears here translated into Arabic",
    paneRightEmpty: "Arabic speech appears here translated into English",
    resetPassword: "Reset password",
    email: "Email",
    sendResetLink: "Send reset link",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    savePassword: "Save password",
  },
};

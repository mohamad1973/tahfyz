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
  paneStudent: string;
  paneSheikh: string;
  writeMessage: string;
  clearChat: string;
  talk: string;
  speakAr: string;
  holdToRecord: string;
  tapToRecord: string;
  tapToStop: string;
  recording: string;
  requestingMic: string;
  micDeniedHelp: string;
  micDeadHelp: string;
  micRetry: string;
  speechUnsupported: string;
  noSpeechHeard: string;
  uploadingAudio: string;
  transcribingAudio: string;
  typeWhatYouSaid: string;
  sendWithAudio: string;
  listenTranslation: string;
  generatingSpeech: string;
  speechFailed: string;
  speechTermsNeeded: string;
  deleteLine: string;
  resetPassword: string;
  email: string;
  sendResetLink: string;
  newPassword: string;
  confirmPassword: string;
  savePassword: string;
  installTitle: string;
  installBody: string;
  installIosHint: string;
  installAction: string;
  installLater: string;
  installWaiting: string;
  saveLine: string;
  savedLine: string;
  saveAllLocal: string;
  downloadLessonFile: string;
  clearServerConfirm: string;
  lessonSavedOk: string;
  lessonSavedNone: string;
  lessonDownloadEmpty: string;
  lessonDownloadOk: string;
  startLiveCall: string;
  joinLiveCall: string;
  endLiveCall: string;
  liveCallHint: string;
  liveCallConnecting: string;
  liveCallNeedPeer: string;
  liveCallLive: string;
  liveCallMicError: string;
  liveCallStudentWait: string;
  liveCallSheikhStarted: string;
  liveCallAllowMic: string;
  liveCallJoinRetry: string;
  liveCallPlayAudio: string;
  liveCallNoAudio: string;
  messageNotFound: string;
  chatSyncFailed: string;
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
      "سجّل بالصوت — بعد التوقّف يُحوَّل الكلام إلى نص ثم يُترجم تلقائياً (معلم وطالب).",
    paneLeftEmpty: "الكلام الإنجليزي يظهر هنا مترجماً للعربية",
    paneRightEmpty: "الكلام العربي يظهر هنا مترجماً للإنجليزية",
    paneStudent: "الطالب",
    paneSheikh: "الشيخ",
    writeMessage: "كتابة رسالة",
    clearChat: "حذف من السيرفر",
    talk: "Talk",
    speakAr: "تحدث",
    holdToRecord: "اضغط باستمرار للتسجيل — ارفع للتحويل والترجمة",
    tapToRecord: "اضغط للتسجيل — اضغط مجدداً للإيقاف ثم التحويل والترجمة",
    tapToStop: "يسجّل… اضغط للإيقاف",
    recording: "يسجّل… ارفع للإرسال",
    requestingMic: "جاري طلب الميكروفون…",
    micDeniedHelp:
      "الميكروفون مغلق أو مرفوض. من إعدادات المتصفح اسمح بالميكروفون لهذا الموقع ثم أعد المحاولة.",
    micDeadHelp:
      "الميكروفون غير فعّال. تأكد أنه مفتوح في إعدادات الهاتف والمتصفح ثم أعد المحاولة.",
    micRetry: "إعادة محاولة الميكروفون",
    speechUnsupported:
      "تعذر التعرف التلقائي. اكتب في الحقل أو أعد التسجيل.",
    noSpeechHeard: "لم يُفهم الكلام — اكتب الجملة ثم إرسال، أو سجّل مجدداً.",
    uploadingAudio: "يرفع الصوت…",
    transcribingAudio: "يحوّل الصوت إلى نص…",
    typeWhatYouSaid: "الصوت جاهز — اكتب الجملة هنا ثم إرسال (يُترجم ويُرفق الصوت)",
    sendWithAudio: "إرسال مع الصوت",
    listenTranslation: "استمع للترجمة",
    generatingSpeech: "جاري القراءة…",
    speechFailed: "تعذّر قراءة الترجمة",
    speechTermsNeeded:
      "قراءة Groq تحتاج موافقة المسؤول على شروط النموذج في حساب Groq.",
    deleteLine: "حذف",
    resetPassword: "إعادة تعيين كلمة المرور",
    email: "البريد الإلكتروني",
    sendResetLink: "إرسال رابط الاسترجاع",
    newPassword: "كلمة مرور جديدة",
    confirmPassword: "تأكيد كلمة المرور",
    savePassword: "حفظ كلمة المرور",
    installTitle: "ثبّت تطبيق Tahfyz",
    installBody: "ثبّته على جهازك لفتحه بسرعة مثل التطبيقات — بدون متجر.",
    installIosHint:
      "على الآيفون: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية» لتثبيت Tahfyz.",
    installAction: "تثبيت Tahfyz",
    installLater: "لاحقاً",
    installWaiting: "جاري تجهيز التثبيت…",
    saveLine: "حفظ",
    savedLine: "محفوظ",
    saveAllLocal: "حفظ الكل على جهازي",
    downloadLessonFile: "تنزيل ملف الدرس",
    clearServerConfirm:
      "حذف المحادثة من السيرفر؟ ما حفظته على جهازك يبقى. تأكد أنك نزّلت الملف إن أردت.",
    lessonSavedOk: "تم الحفظ على جهازك",
    lessonSavedNone: "لا رسائل جديدة للحفظ (أو لا رسائل في الشات)",
    lessonDownloadEmpty: "لا يوجد محفوظ محلياً اليوم — احفظ جملاً أو احفظ الكل أولاً",
    lessonDownloadOk: "تم تنزيل أرشيف الدرس (نص + صوت بأسماء إنجليزية)",
    startLiveCall: "بدء الحصة",
    joinLiveCall: "انضمام للحصة",
    endLiveCall: "إنهاء الحصة",
    liveCallHint:
      "الشيخ يضغط بدء الحصة فقط. ثم الطالب يضغط السماح بالميكروفون. الشات القديم يبقى كما هو.",
    liveCallConnecting: "جاري الاتصال… اسمح بالميكروفون",
    liveCallNeedPeer: "بانتظار الطالب… أبقِ صفحة الطالب مفتوحة على نفس الشات",
    liveCallLive: "متصل — يفترض أن تسمع الطرف الآخر وتتكلم",
    liveCallMicError: "تعذر فتح الميكروفون. اسمح به من إعدادات المتصفح.",
    liveCallStudentWait: "انتظر حتى يبدأ الشيخ الحصة من جهازه",
    liveCallSheikhStarted: "الشيخ بدأ الحصة — اضغط للسماح بالميكروفون",
    liveCallAllowMic: "السماح بالميكروفون لسماع الشيخ",
    liveCallJoinRetry: "تعذر الانضمام. اضغط السماح بالميكروفون مرة أخرى.",
    liveCallPlayAudio: "تشغيل صوت الطرف الآخر",
    liveCallNoAudio:
      "اسمح بالميكروفون وانتظر حتى يظهر متصل. إن استمر الفشل يلزم خادم TURN.",
    messageNotFound: "الرسالة لم تعد موجودة",
    chatSyncFailed:
      "تعذر تحديث الشات من السيرفر. تحقق من الاتصال ثم أبقِ الصفحة مفتوحة.",
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
      "Record your voice — after you stop, speech becomes text then translates automatically (teacher and student).",
    paneLeftEmpty: "English speech appears here translated into Arabic",
    paneRightEmpty: "Arabic speech appears here translated into English",
    paneStudent: "Student",
    paneSheikh: "Sheikh",
    writeMessage: "Write a message",
    clearChat: "Delete from server",
    talk: "Talk",
    speakAr: "تحدث",
    holdToRecord: "Hold to record — release to transcribe and translate",
    tapToRecord: "Tap to record — tap again to stop, then transcribe and translate",
    tapToStop: "Recording… tap to stop",
    recording: "Recording… release to send",
    requestingMic: "Requesting microphone…",
    micDeniedHelp:
      "Microphone blocked. Allow mic for this site in browser settings, then retry.",
    micDeadHelp:
      "Microphone is not active. Enable it in phone/browser settings, then retry.",
    micRetry: "Retry microphone",
    speechUnsupported:
      "Automatic recognition failed. Type in the box or record again.",
    noSpeechHeard: "Speech not understood — type the sentence then Send, or record again.",
    uploadingAudio: "Uploading audio…",
    transcribingAudio: "Converting speech to text…",
    typeWhatYouSaid: "Audio ready — type the sentence here, then Send (translates and attaches audio)",
    sendWithAudio: "Send with audio",
    listenTranslation: "Listen to translation",
    generatingSpeech: "Generating speech…",
    speechFailed: "Could not read translation",
    speechTermsNeeded:
      "Groq reading needs the account admin to accept the model terms in Groq Console.",
    deleteLine: "Delete",
    resetPassword: "Reset password",
    email: "Email",
    sendResetLink: "Send reset link",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    savePassword: "Save password",
    installTitle: "Install Tahfyz",
    installBody: "Install on your device for quick access like an app — no store needed.",
    installIosHint:
      "On iPhone: tap Share, then “Add to Home Screen” to install Tahfyz.",
    installAction: "Install Tahfyz",
    installLater: "Later",
    installWaiting: "Preparing install…",
    saveLine: "Save",
    savedLine: "Saved",
    saveAllLocal: "Save all to my device",
    downloadLessonFile: "Download lesson file",
    clearServerConfirm:
      "Delete the chat from the server? What you saved on your device stays. Download the file first if you need it.",
    lessonSavedOk: "Saved on your device",
    lessonSavedNone: "Nothing new to save (or chat is empty)",
    lessonDownloadEmpty: "Nothing saved locally today — save lines or Save all first",
    lessonDownloadOk: "Lesson archive downloaded (text + audio with English names)",
    startLiveCall: "Start lesson",
    joinLiveCall: "Join lesson",
    endLiveCall: "End lesson",
    liveCallHint:
      "Only the sheikh taps Start lesson. Then the student taps Allow microphone. The old chat stays.",
    liveCallConnecting: "Connecting… allow the microphone",
    liveCallNeedPeer: "Waiting for the student… keep their chat page open",
    liveCallLive: "Connected — you should hear each other and can speak",
    liveCallMicError: "Could not open the microphone. Allow it in browser settings.",
    liveCallStudentWait: "Wait until the sheikh starts the lesson from his device",
    liveCallSheikhStarted: "The sheikh started the lesson — tap to allow the microphone",
    liveCallAllowMic: "Allow microphone to hear the sheikh",
    liveCallJoinRetry: "Could not join. Tap Allow microphone again.",
    liveCallPlayAudio: "Play the other person’s audio",
    liveCallNoAudio:
      "Allow the microphone and wait until Connected appears. If it still fails, a TURN server is required.",
    messageNotFound: "That message is no longer available",
    chatSyncFailed:
      "Could not refresh the chat from the server. Check the connection and keep this page open.",
  },
};

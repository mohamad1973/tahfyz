import type { AppData, Teacher } from "./types";
import { hashPassword, uid } from "./utils";

const DEMO_TEACHERS: Omit<Teacher, "videos" | "audios">[] = [
  {
    id: "tch_ahmed",
    name: "Sheikh Ahmed Hassan",
    nameAr: "الشيخ أحمد حسن",
    photoUrl: "/teachers/teacher-01.png",
    bio: "Azhar graduate with 12 years teaching Quran and Tajweed to English-speaking students across the US and Europe.",
    bioAr:
      "خريج الأزهر بخبرة ١٢ عاماً في تحفيظ القرآن والتجويد للناطقين بالإنجليزية في أمريكا وأوروبا.",
    subjects: ["Quran Memorization", "Tajweed", "Quranic Arabic"],
    active: true,
    userId: "usr_ahmed",
    priceUsd: 25,
  },
  {
    id: "tch_ibrahim",
    name: "Sheikh Ibrahim Saleh",
    nameAr: "الشيخ إبراهيم صالح",
    photoUrl: "/teachers/teacher-02.png",
    bio: "Senior Hifz mentor focused on revision cycles and long-term retention for adult learners abroad.",
    bioAr:
      "محفّظ متمرس يركز على المراجعات وترسيخ الحفظ للكبار المغتربين.",
    subjects: ["Quran Memorization", "Tajweed", "Revision Plans"],
    active: true,
    userId: "usr_ibrahim",
    priceUsd: 28,
  },
  {
    id: "tch_omar",
    name: "Sheikh Omar Mahmoud",
    nameAr: "الشيخ عمر محمود",
    photoUrl: "/teachers/teacher-03.png",
    bio: "Ijazah holder in Hafs 'an Asim. Clear pronunciation coaching for non-Arab beginners and intermediates.",
    bioAr:
      "حاصل على إجازة برواية حفص عن عاصم. يدرّب على النطق السليم للمبتدئين والمتوسطين من غير العرب.",
    subjects: ["Quran Memorization", "Tajweed", "Ijazah Prep"],
    active: true,
    userId: "usr_omar",
    priceUsd: 30,
  },
  {
    id: "tch_yusuf",
    name: "Sheikh Yusuf Ibrahim",
    nameAr: "الشيخ يوسف إبراهيم",
    photoUrl: "/teachers/teacher-04.png",
    bio: "Teaches Quranic Arabic and Tafsir alongside Hifz so students understand what they memorize.",
    bioAr:
      "يدرس العربية القرآنية والتفسير مع التحفيظ ليفهم الطالب ما يحفظه.",
    subjects: ["Quran Memorization", "Quranic Arabic", "Tafsir"],
    active: true,
    userId: "usr_yusuf",
    priceUsd: 27,
  },
  {
    id: "tch_khaled",
    name: "Sheikh Khaled Farouk",
    nameAr: "الشيخ خالد فاروق",
    photoUrl: "/teachers/teacher-05.png",
    bio: "Specialist in kids and teens Hifz with structured weekly targets and gentle correction.",
    bioAr:
      "متخصص في تحفيظ الأطفال والناشئة بأهداف أسبوعية وتصحيح لطيف.",
    subjects: ["Kids Hifz", "Tajweed", "Quran Memorization"],
    active: true,
    userId: "usr_khaled",
    priceUsd: 22,
  },
  {
    id: "tch_mostafa",
    name: "Sheikh Mostafa Nabil",
    nameAr: "الشيخ مصطفى نبيل",
    photoUrl: "/teachers/teacher-06.png",
    bio: "Evening-friendly schedule for North America. Strong focus on muraja'ah and fluency.",
    bioAr:
      "جدول مسائي مناسب لأمريكا الشمالية مع تركيز على المراجعة والطلاقة.",
    subjects: ["Quran Memorization", "Tajweed", "Fluency"],
    active: true,
    userId: "usr_mostafa",
    priceUsd: 26,
  },
  {
    id: "tch_abdelrahman",
    name: "Sheikh Abdelrahman Said",
    nameAr: "الشيخ عبد الرحمن سعيد",
    photoUrl: "/teachers/teacher-07.png",
    bio: "Decades of experience preparing students for full Quran completion and community teaching.",
    bioAr:
      "خبرة عقود في إعداد الطلاب لإتمام المصحف وتعليم الآخرين.",
    subjects: ["Full Hifz", "Tajweed", "Teacher Prep"],
    active: true,
    userId: "usr_abdelrahman",
    priceUsd: 35,
  },
  {
    id: "tch_hassan",
    name: "Sheikh Hassan Ali",
    nameAr: "الشيخ حسن علي",
    photoUrl: "/teachers/teacher-08.png",
    bio: "Patient starter path for new Muslims and absolute beginners — letters, makharij, then short surahs.",
    bioAr:
      "مسار هادئ للمبتدئين والمسلمين الجدد: الحروف والمخارج ثم القصار.",
    subjects: ["Beginners", "Tajweed Basics", "Short Surahs"],
    active: true,
    userId: "usr_hassan",
    priceUsd: 20,
  },
];

export async function createSeedData(): Promise<AppData> {
  const adminPass = await hashPassword("admin123");
  const teacherPass = await hashPassword("teacher123");

  const teachers: Teacher[] = DEMO_TEACHERS.map((t) => ({
    ...t,
    videos: [],
    audios: [],
  }));

  const users = [
    {
      id: "usr_admin",
      username: "admin",
      email: "admin@tahfyz.com",
      passwordHash: adminPass,
      name: "Tahfyz Admin",
      role: "admin" as const,
      phone: "+201000000001",
      whatsapp: "+201000000001",
      createdAt: new Date().toISOString(),
    },
    ...teachers.map((t, i) => {
      const username = [
        "ahmed",
        "ibrahim",
        "omar",
        "yusuf",
        "khaled",
        "mostafa",
        "abdelrahman",
        "hassan",
      ][i];
      return {
        id: t.userId!,
        username,
        email: `${username}@tahfyz.com`,
        passwordHash: teacherPass,
        name: t.name,
        role: "teacher" as const,
        teacherId: t.id,
        phone: `+2010000000${10 + i}`,
        whatsapp: `+2010000000${10 + i}`,
        createdAt: new Date().toISOString(),
      };
    }),
  ];

  const availability = teachers.flatMap((t) => {
    const slots = [
      { dayOfWeek: 0, startHour: 18, endHour: 22 },
      { dayOfWeek: 1, startHour: 17, endHour: 21 },
      { dayOfWeek: 2, startHour: 18, endHour: 22 },
      { dayOfWeek: 3, startHour: 17, endHour: 21 },
      { dayOfWeek: 4, startHour: 16, endHour: 20 },
      { dayOfWeek: 6, startHour: 10, endHour: 14 },
    ];
    return slots.map((s) => ({
      id: uid("avl"),
      teacherId: t.id,
      ...s,
    }));
  });

  return {
    users,
    teachers,
    availability,
    bookings: [],
    notifications: [],
    parentLinks: [],
  };
}

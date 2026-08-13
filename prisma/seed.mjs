import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash("sha256").update(`tahfyz:${password}`).digest("hex");
}

const teachers = [
  {
    id: "tch_ahmed",
    name: "Sheikh Ahmed Hassan",
    nameAr: "الشيخ أحمد حسن",
    photoUrl: "/teachers/teacher-01.png",
    bio: "Azhar graduate with 12 years teaching Quran and Tajweed to English-speaking students across the US and Europe.",
    bioAr:
      "خريج الأزهر بخبرة ١٢ عاماً في تحفيظ القرآن والتجويد للناطقين بالإنجليزية في أمريكا وأوروبا.",
    subjects: ["Quran Memorization", "Tajweed", "Quranic Arabic"],
    userId: "usr_ahmed",
    priceUsd: 25,
  },
  {
    id: "tch_ibrahim",
    name: "Sheikh Ibrahim Saleh",
    nameAr: "الشيخ إبراهيم صالح",
    photoUrl: "/teachers/teacher-02.png",
    bio: "Senior Hifz mentor focused on revision cycles and long-term retention for adult learners abroad.",
    bioAr: "محفّظ متمرس يركز على المراجعات وترسيخ الحفظ للكبار المغتربين.",
    subjects: ["Quran Memorization", "Tajweed", "Revision Plans"],
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
    userId: "usr_omar",
    priceUsd: 30,
  },
  {
    id: "tch_yusuf",
    name: "Sheikh Yusuf Ibrahim",
    nameAr: "الشيخ يوسف إبراهيم",
    photoUrl: "/teachers/teacher-04.png",
    bio: "Teaches Quranic Arabic and Tafsir alongside Hifz so students understand what they memorize.",
    bioAr: "يدرس العربية القرآنية والتفسير مع التحفيظ ليفهم الطالب ما يحفظه.",
    subjects: ["Quran Memorization", "Quranic Arabic", "Tafsir"],
    userId: "usr_yusuf",
    priceUsd: 27,
  },
  {
    id: "tch_khaled",
    name: "Sheikh Khaled Farouk",
    nameAr: "الشيخ خالد فاروق",
    photoUrl: "/teachers/teacher-05.png",
    bio: "Specialist in kids and teens Hifz with structured weekly targets and gentle correction.",
    bioAr: "متخصص في تحفيظ الأطفال والناشئة بأهداف أسبوعية وتصحيح لطيف.",
    subjects: ["Kids Hifz", "Tajweed", "Quran Memorization"],
    userId: "usr_khaled",
    priceUsd: 22,
  },
  {
    id: "tch_mostafa",
    name: "Sheikh Mostafa Nabil",
    nameAr: "الشيخ مصطفى نبيل",
    photoUrl: "/teachers/teacher-06.png",
    bio: "Evening-friendly schedule for North America. Strong focus on muraja'ah and fluency.",
    bioAr: "جدول مسائي مناسب لأمريكا الشمالية مع تركيز على المراجعة والطلاقة.",
    subjects: ["Quran Memorization", "Tajweed", "Fluency"],
    userId: "usr_mostafa",
    priceUsd: 26,
  },
  {
    id: "tch_abdelrahman",
    name: "Sheikh Abdelrahman Said",
    nameAr: "الشيخ عبد الرحمن سعيد",
    photoUrl: "/teachers/teacher-07.png",
    bio: "Decades of experience preparing students for full Quran completion and community teaching.",
    bioAr: "خبرة عقود في إعداد الطلاب لإتمام المصحف وتعليم الآخرين.",
    subjects: ["Full Hifz", "Tajweed", "Teacher Prep"],
    userId: "usr_abdelrahman",
    priceUsd: 35,
  },
  {
    id: "tch_hassan",
    name: "Sheikh Hassan Ali",
    nameAr: "الشيخ حسن علي",
    photoUrl: "/teachers/teacher-08.png",
    bio: "Patient starter path for new Muslims and absolute beginners — letters, makharij, then short surahs.",
    bioAr: "مسار هادئ للمبتدئين والمسلمين الجدد: الحروف والمخارج ثم القصار.",
    subjects: ["Beginners", "Tajweed Basics", "Short Surahs"],
    userId: "usr_hassan",
    priceUsd: 20,
  },
];

async function main() {
  await prisma.notification.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.teacherMedia.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();
  const teacherPass = hashPassword("123456");

  await prisma.user.create({
    data: {
      id: "usr_admin",
      username: "admin",
      email: "admin@tahfyz.com",
      passwordHash: hashPassword("admin123"),
      name: "Tahfyz Admin",
      role: "admin",
      phone: "+201000000001",
      whatsapp: "+201000000001",
      createdAt: now,
    },
  });

  const usernames = [
    "ahmed",
    "ibrahim",
    "omar",
    "yusuf",
    "khaled",
    "mostafa",
    "abdelrahman",
    "hassan",
  ];

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    await prisma.user.create({
      data: {
        id: t.userId,
        username: usernames[i],
        email: `${usernames[i]}@tahfyz.com`,
        passwordHash: teacherPass,
        name: t.name,
        role: "teacher",
        teacherId: t.id,
        phone: `+2010000000${10 + i}`,
        whatsapp: `+2010000000${10 + i}`,
        createdAt: now,
      },
    });
    await prisma.teacher.create({
      data: {
        id: t.id,
        name: t.name,
        nameAr: t.nameAr,
        photoUrl: t.photoUrl,
        bio: t.bio,
        bioAr: t.bioAr,
        subjects: t.subjects,
        active: true,
        userId: t.userId,
        priceUsd: t.priceUsd,
      },
    });
  }

  const windows = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startHour: 0,
    endHour: 24,
  }));

  for (const t of teachers) {
    for (const w of windows) {
      await prisma.teacherAvailability.create({
        data: {
          id: `avl_${t.id}_${w.dayOfWeek}_${w.startHour}`,
          teacherId: t.id,
          dayOfWeek: w.dayOfWeek,
          startHour: w.startHour,
          endHour: w.endHour,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

/**
 * Ensures demo admin + teacher accounts exist with known passwords.
 * Safe to run on production — does NOT delete bookings or other data.
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash("sha256").update(`tahfyz:${password}`).digest("hex");
}

const teachers = [
  {
    id: "tch_ahmed",
    userId: "usr_ahmed",
    username: "ahmed",
    name: "Sheikh Ahmed Hassan",
    nameAr: "الشيخ أحمد حسن",
    photoUrl: "/teachers/teacher-01.png",
    bio: "Azhar graduate with 12 years teaching Quran and Tajweed to English-speaking students across the US and Europe.",
    bioAr:
      "خريج الأزهر بخبرة ١٢ عاماً في تحفيظ القرآن والتجويد للناطقين بالإنجليزية في أمريكا وأوروبا.",
    subjects: ["Quran Memorization", "Tajweed", "Quranic Arabic"],
    priceUsd: 25,
  },
  {
    id: "tch_ibrahim",
    userId: "usr_ibrahim",
    username: "ibrahim",
    name: "Sheikh Ibrahim Saleh",
    nameAr: "الشيخ إبراهيم صالح",
    photoUrl: "/teachers/teacher-02.png",
    bio: "Senior Hifz mentor focused on revision cycles and long-term retention for adult learners abroad.",
    bioAr: "محفّظ متمرس يركز على المراجعات وترسيخ الحفظ للكبار المغتربين.",
    subjects: ["Quran Memorization", "Tajweed", "Revision Plans"],
    priceUsd: 28,
  },
  {
    id: "tch_omar",
    userId: "usr_omar",
    username: "omar",
    name: "Sheikh Omar Mahmoud",
    nameAr: "الشيخ عمر محمود",
    photoUrl: "/teachers/teacher-03.png",
    bio: "Ijazah holder in Hafs 'an Asim. Clear pronunciation coaching for non-Arab beginners and intermediates.",
    bioAr:
      "حاصل على إجازة برواية حفص عن عاصم. يدرّب على النطق السليم للمبتدئين والمتوسطين من غير العرب.",
    subjects: ["Quran Memorization", "Tajweed", "Ijazah Prep"],
    priceUsd: 30,
  },
  {
    id: "tch_yusuf",
    userId: "usr_yusuf",
    username: "yusuf",
    name: "Sheikh Yusuf Ibrahim",
    nameAr: "الشيخ يوسف إبراهيم",
    photoUrl: "/teachers/teacher-04.png",
    bio: "Teaches Quranic Arabic and Tafsir alongside Hifz so students understand what they memorize.",
    bioAr: "يدرس العربية القرآنية والتفسير مع التحفيظ ليفهم الطالب ما يحفظه.",
    subjects: ["Quran Memorization", "Quranic Arabic", "Tafsir"],
    priceUsd: 27,
  },
  {
    id: "tch_khaled",
    userId: "usr_khaled",
    username: "khaled",
    name: "Sheikh Khaled Farouk",
    nameAr: "الشيخ خالد فاروق",
    photoUrl: "/teachers/teacher-05.png",
    bio: "Specialist in kids and teens Hifz with structured weekly targets and gentle correction.",
    bioAr: "متخصص في تحفيظ الأطفال والناشئة بأهداف أسبوعية وتصحيح لطيف.",
    subjects: ["Kids Hifz", "Tajweed", "Quran Memorization"],
    priceUsd: 22,
  },
  {
    id: "tch_mostafa",
    userId: "usr_mostafa",
    username: "mostafa",
    name: "Sheikh Mostafa Nabil",
    nameAr: "الشيخ مصطفى نبيل",
    photoUrl: "/teachers/teacher-06.png",
    bio: "Evening-friendly schedule for North America. Strong focus on muraja'ah and fluency.",
    bioAr: "جدول مسائي مناسب لأمريكا الشمالية مع تركيز على المراجعة والطلاقة.",
    subjects: ["Quran Memorization", "Tajweed", "Fluency"],
    priceUsd: 26,
  },
  {
    id: "tch_abdelrahman",
    userId: "usr_abdelrahman",
    username: "abdelrahman",
    name: "Sheikh Abdelrahman Said",
    nameAr: "الشيخ عبد الرحمن سعيد",
    photoUrl: "/teachers/teacher-07.png",
    bio: "Decades of experience preparing students for full Quran completion and community teaching.",
    bioAr: "خبرة عقود في إعداد الطلاب لإتمام المصحف وتعليم الآخرين.",
    subjects: ["Full Hifz", "Tajweed", "Teacher Prep"],
    priceUsd: 35,
  },
  {
    id: "tch_hassan",
    userId: "usr_hassan",
    username: "hassan",
    name: "Sheikh Hassan Ali",
    nameAr: "الشيخ حسن علي",
    photoUrl: "/teachers/teacher-08.png",
    bio: "Patient starter path for new Muslims and absolute beginners — letters, makharij, then short surahs.",
    bioAr: "مسار هادئ للمبتدئين والمسلمين الجدد: الحروف والمخارج ثم القصار.",
    subjects: ["Beginners", "Tajweed Basics", "Short Surahs"],
    priceUsd: 20,
  },
];

async function ensureAdmin(now) {
  const passwordHash = hashPassword("admin123");
  await prisma.user.upsert({
    where: { id: "usr_admin" },
    create: {
      id: "usr_admin",
      username: "admin",
      email: "admin@tahfyz.com",
      passwordHash,
      name: "Tahfyz Admin",
      role: "admin",
      phone: "+201000000001",
      whatsapp: "+201000000001",
      createdAt: now,
    },
    update: {
      username: "admin",
      email: "admin@tahfyz.com",
      passwordHash,
      role: "admin",
    },
  });
  console.log("admin: ok (admin / admin123)");
}

async function ensureTeacher(t, now, teacherPass) {
  const email = `${t.username}@tahfyz.com`;
  const phone = `+2010000000${10 + teachers.indexOf(t)}`;

  await prisma.user.upsert({
    where: { id: t.userId },
    create: {
      id: t.userId,
      username: t.username,
      email,
      passwordHash: teacherPass,
      name: t.name,
      role: "teacher",
      teacherId: t.id,
      phone,
      whatsapp: phone,
      createdAt: now,
    },
    update: {
      username: t.username,
      email,
      passwordHash: teacherPass,
      role: "teacher",
      teacherId: t.id,
    },
  });

  await prisma.teacher.upsert({
    where: { id: t.id },
    create: {
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
    update: {
      name: t.name,
      nameAr: t.nameAr,
      active: true,
      userId: t.userId,
    },
  });

  const existing = await prisma.teacherAvailability.count({
    where: { teacherId: t.id },
  });
  if (existing === 0) {
    for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
      await prisma.teacherAvailability.create({
        data: {
          id: `avl_${t.id}_${dayOfWeek}_0`,
          teacherId: t.id,
          dayOfWeek,
          startHour: 0,
          endHour: 24,
        },
      });
    }
  }

  console.log(`teacher: ${t.username} ok (${t.username} / 123456)`);
}

async function main() {
  const now = new Date();
  const teacherPass = hashPassword("123456");

  await ensureAdmin(now);
  for (const t of teachers) {
    await ensureTeacher(t, now, teacherPass);
  }
  console.log("Done — demo accounts ready.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

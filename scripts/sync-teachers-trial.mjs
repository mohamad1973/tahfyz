import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash("sha256").update(`tahfyz:${password}`).digest("hex");
}

async function main() {
  const teacherHash = hashPassword("123456");
  const teachers = await prisma.teacher.findMany({ select: { id: true, userId: true } });

  for (const t of teachers) {
    if (t.userId) {
      await prisma.user.update({
        where: { id: t.userId },
        data: { passwordHash: teacherHash },
      });
    }
    await prisma.teacherAvailability.deleteMany({ where: { teacherId: t.id } });
    await prisma.teacherAvailability.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        id: `avl_${t.id}_${dayOfWeek}_0`,
        teacherId: t.id,
        dayOfWeek,
        startHour: 0,
        endHour: 24,
      })),
    });
    console.log(`updated teacher ${t.id}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

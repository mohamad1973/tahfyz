import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (u.username) continue;
    let base =
      (u.email || u.id)
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "") || "user";
    if (base.length < 3) base = (base + "123").slice(0, 32);
    let candidate = base.slice(0, 32);
    let n = 0;
    while (
      await prisma.user.findFirst({
        where: { username: candidate, NOT: { id: u.id } },
      })
    ) {
      n += 1;
      candidate = (base.slice(0, 28) + n).slice(0, 32);
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { username: candidate },
    });
    console.log(`${u.id} -> ${candidate}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const total = await prisma.user.count();
const missing = await prisma.user.count({ where: { username: null } });
console.log(`total=${total} missingUsername=${missing}`);
await prisma.$disconnect();

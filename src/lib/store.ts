import { prisma } from "./db";
import type {
  AvailabilitySlot,
  Booking,
  BookingStatus,
  MediaItem,
  Notification,
  ParentStudentLink,
  PaymentMethod,
  Role,
  Teacher,
  User,
} from "./types";

function toUser(row: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  phone: string | null;
  whatsapp: string | null;
  teacherId: string | null;
  mustSetPassword: boolean;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    role: row.role,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    teacherId: row.teacherId ?? undefined,
    mustSetPassword: row.mustSetPassword,
    createdAt: row.createdAt.toISOString(),
  };
}

function toTeacher(row: {
  id: string;
  name: string;
  nameAr: string;
  photoUrl: string;
  bio: string;
  bioAr: string;
  subjects: unknown;
  active: boolean;
  userId: string | null;
  priceUsd: number;
  media: { id: string; kind: "video" | "audio"; title: string; url: string }[];
}): Teacher {
  const videos: MediaItem[] = row.media
    .filter((m) => m.kind === "video")
    .map((m) => ({ id: m.id, title: m.title, url: m.url }));
  const audios: MediaItem[] = row.media
    .filter((m) => m.kind === "audio")
    .map((m) => ({ id: m.id, title: m.title, url: m.url }));

  return {
    id: row.id,
    name: row.name,
    nameAr: row.nameAr,
    photoUrl: row.photoUrl,
    bio: row.bio,
    bioAr: row.bioAr,
    subjects: Array.isArray(row.subjects)
      ? row.subjects.filter((x): x is string => typeof x === "string")
      : [],
    active: row.active,
    userId: row.userId ?? undefined,
    videos,
    audios,
    priceUsd: row.priceUsd,
  };
}

function toBooking(row: {
  id: string;
  teacherId: string;
  slotStart: Date;
  slotEnd: Date;
  guestName: string;
  guestEmail: string;
  phone: string;
  whatsapp: string;
  timezone: string;
  notes: string | null;
  status: BookingStatus;
  holdExpiresAt: Date;
  studentId: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  amountUsd: number;
  paymentMethod: PaymentMethod | null;
  paidAt: Date | null;
}): Booking {
  return {
    id: row.id,
    teacherId: row.teacherId,
    slotStart: row.slotStart.toISOString(),
    slotEnd: row.slotEnd.toISOString(),
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    phone: row.phone,
    whatsapp: row.whatsapp,
    timezone: row.timezone,
    notes: row.notes ?? undefined,
    status: row.status,
    holdExpiresAt: row.holdExpiresAt.toISOString(),
    studentId: row.studentId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString(),
    amountUsd: row.amountUsd,
    paymentMethod: row.paymentMethod ?? undefined,
    paidAt: row.paidAt?.toISOString(),
  };
}

function toNotification(row: {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
  bookingId: string | null;
}): Notification {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
    bookingId: row.bookingId ?? undefined,
  };
}

export async function getTeachers(): Promise<Teacher[]> {
  const rows = await prisma.teacher.findMany({
    where: { active: true },
    include: { media: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toTeacher);
}

export async function getTeacher(id: string): Promise<Teacher | undefined> {
  const row = await prisma.teacher.findUnique({
    where: { id },
    include: { media: true },
  });
  return row ? toTeacher(row) : undefined;
}

export async function getAvailability(
  teacherId: string,
): Promise<AvailabilitySlot[]> {
  const rows = await prisma.teacherAvailability.findMany({
    where: { teacherId },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    teacherId: r.teacherId,
    dayOfWeek: r.dayOfWeek,
    startHour: r.startHour,
    endHour: r.endHour,
  }));
}

export async function getBookings(filter?: {
  status?: BookingStatus;
  teacherId?: string;
  studentId?: string;
}): Promise<Booking[]> {
  const rows = await prisma.booking.findMany({
    where: {
      status: filter?.status,
      teacherId: filter?.teacherId,
      studentId: filter?.studentId,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toBooking);
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const row = await prisma.booking.findUnique({ where: { id } });
  return row ? toBooking(row) : undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const row = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
  });
  return row ? toUser(row) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toUser(row) : undefined;
}

export async function addBooking(booking: Booking): Promise<Booking> {
  const row = await prisma.booking.create({
    data: {
      id: booking.id,
      teacherId: booking.teacherId,
      slotStart: new Date(booking.slotStart),
      slotEnd: new Date(booking.slotEnd),
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      phone: booking.phone,
      whatsapp: booking.whatsapp,
      timezone: booking.timezone,
      notes: booking.notes ?? null,
      status: booking.status,
      holdExpiresAt: new Date(booking.holdExpiresAt),
      studentId: booking.studentId ?? null,
      createdAt: new Date(booking.createdAt),
      confirmedAt: booking.confirmedAt ? new Date(booking.confirmedAt) : null,
      amountUsd: booking.amountUsd,
      paymentMethod: booking.paymentMethod ?? null,
      paidAt: booking.paidAt ? new Date(booking.paidAt) : null,
    },
  });
  return toBooking(row);
}

export async function updateBooking(
  id: string,
  patch: Partial<Booking>,
): Promise<Booking | null> {
  const row = await prisma.booking.findUnique({ where: { id } });
  if (!row) return null;

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      teacherId: patch.teacherId,
      slotStart: patch.slotStart ? new Date(patch.slotStart) : undefined,
      slotEnd: patch.slotEnd ? new Date(patch.slotEnd) : undefined,
      guestName: patch.guestName,
      guestEmail: patch.guestEmail,
      phone: patch.phone,
      whatsapp: patch.whatsapp,
      timezone: patch.timezone,
      notes: patch.notes,
      status: patch.status,
      holdExpiresAt: patch.holdExpiresAt
        ? new Date(patch.holdExpiresAt)
        : undefined,
      studentId: patch.studentId,
      createdAt: patch.createdAt ? new Date(patch.createdAt) : undefined,
      confirmedAt: patch.confirmedAt ? new Date(patch.confirmedAt) : undefined,
      amountUsd: patch.amountUsd,
      paymentMethod: patch.paymentMethod,
      paidAt: patch.paidAt ? new Date(patch.paidAt) : undefined,
    },
  });
  return toBooking(updated);
}

export async function addUser(user: User): Promise<User> {
  const row = await prisma.user.create({
    data: {
      id: user.id,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role,
      phone: user.phone ?? null,
      whatsapp: user.whatsapp ?? null,
      teacherId: user.teacherId ?? null,
      mustSetPassword: user.mustSetPassword ?? false,
      createdAt: new Date(user.createdAt),
    },
  });
  return toUser(row);
}

export async function updateUser(
  id: string,
  patch: Partial<User>,
): Promise<User | null> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.user.update({
    where: { id },
    data: {
      email: patch.email?.toLowerCase(),
      passwordHash: patch.passwordHash,
      name: patch.name,
      role: patch.role,
      phone: patch.phone,
      whatsapp: patch.whatsapp,
      teacherId: patch.teacherId,
      mustSetPassword: patch.mustSetPassword,
      createdAt: patch.createdAt ? new Date(patch.createdAt) : undefined,
    },
  });
  return toUser(row);
}

export async function addNotification(n: Notification): Promise<Notification> {
  const row = await prisma.notification.create({
    data: {
      id: n.id,
      userId: n.userId,
      title: n.title,
      body: n.body,
      read: n.read,
      createdAt: new Date(n.createdAt),
      bookingId: n.bookingId ?? null,
    },
  });
  return toNotification(row);
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

export async function addParentLink(
  link: ParentStudentLink,
): Promise<ParentStudentLink> {
  const row = await prisma.parentStudentLink.upsert({
    where: {
      parentId_studentId: {
        parentId: link.parentId,
        studentId: link.studentId,
      },
    },
    create: {
      id: link.id,
      parentId: link.parentId,
      studentId: link.studentId,
    },
    update: {},
  });
  return {
    id: row.id,
    parentId: row.parentId,
    studentId: row.studentId,
  };
}

export async function getChildrenForParent(parentId: string): Promise<User[]> {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId },
    include: { student: true },
  });
  return links.map((l) => toUser(l.student));
}

export async function getAllUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toUser);
}

export async function updateTeacher(
  id: string,
  patch: Partial<Teacher>,
): Promise<Teacher | null> {
  const existing = await prisma.teacher.findUnique({
    where: { id },
    include: { media: true },
  });
  if (!existing) return null;

  const hasVideos = patch.videos !== undefined;
  const hasAudios = patch.audios !== undefined;

  await prisma.$transaction(async (tx) => {
    await tx.teacher.update({
      where: { id },
      data: {
        name: patch.name,
        nameAr: patch.nameAr,
        photoUrl: patch.photoUrl,
        bio: patch.bio,
        bioAr: patch.bioAr,
        subjects: patch.subjects as unknown as object | undefined,
        active: patch.active,
        userId: patch.userId,
        priceUsd: patch.priceUsd,
      },
    });

    if (hasVideos) {
      await tx.teacherMedia.deleteMany({ where: { teacherId: id, kind: "video" } });
      if (patch.videos && patch.videos.length > 0) {
        await tx.teacherMedia.createMany({
          data: patch.videos.map((m) => ({
            id: m.id,
            teacherId: id,
            kind: "video",
            title: m.title,
            url: m.url,
          })),
        });
      }
    }

    if (hasAudios) {
      await tx.teacherMedia.deleteMany({ where: { teacherId: id, kind: "audio" } });
      if (patch.audios && patch.audios.length > 0) {
        await tx.teacherMedia.createMany({
          data: patch.audios.map((m) => ({
            id: m.id,
            teacherId: id,
            kind: "audio",
            title: m.title,
            url: m.url,
          })),
        });
      }
    }
  });

  const refreshed = await prisma.teacher.findUnique({
    where: { id },
    include: { media: true },
  });
  return refreshed ? toTeacher(refreshed) : null;
}

export async function expireStaleHolds(): Promise<void> {
  await prisma.booking.updateMany({
    where: {
      status: "pending_payment",
      holdExpiresAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });
}


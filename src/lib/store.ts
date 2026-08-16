import { prisma } from "./db";
import { uid } from "./utils";
import type {
  AvailabilitySlot,
  Booking,
  BookingStatus,
  ChatMessage,
  ChatThread,
  LessonCallState,
  LessonCallStatus,
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
  username: string;
  email: string | null;
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
    username: row.username,
    email: row.email ?? undefined,
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

export async function getTeachers(opts?: {
  includeInactive?: boolean;
}): Promise<Teacher[]> {
  const rows = await prisma.teacher.findMany({
    where: opts?.includeInactive ? undefined : { active: true },
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

export async function getUserByUsername(
  username: string,
): Promise<User | undefined> {
  const row = await prisma.user.findFirst({
    where: { username: username.toLowerCase() },
  });
  return row ? toUser(row) : undefined;
}

/** Login field may be username or full email. */
export async function resolveLoginUser(
  login: string,
): Promise<User | undefined> {
  const trimmed = login.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (trimmed.includes("@")) {
    return getUserByEmail(trimmed);
  }
  return getUserByUsername(trimmed);
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
      username: user.username.toLowerCase(),
      email: user.email ? user.email.toLowerCase() : null,
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
      username: patch.username?.toLowerCase(),
      email:
        patch.email === undefined
          ? undefined
          : patch.email
            ? patch.email.toLowerCase()
            : null,
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

export async function createTeacher(input: {
  id: string;
  name: string;
  nameAr: string;
  photoUrl: string;
  bio: string;
  bioAr: string;
  subjects: string[];
  priceUsd: number;
  userId: string;
  active?: boolean;
}): Promise<Teacher> {
  const row = await prisma.teacher.create({
    data: {
      id: input.id,
      name: input.name,
      nameAr: input.nameAr,
      photoUrl: input.photoUrl,
      bio: input.bio,
      bioAr: input.bioAr,
      subjects: input.subjects,
      active: input.active ?? true,
      userId: input.userId,
      priceUsd: input.priceUsd,
    },
    include: { media: true },
  });
  return toTeacher(row);
}

export async function replaceAvailability(
  teacherId: string,
  slots: Omit<AvailabilitySlot, "id" | "teacherId">[],
): Promise<AvailabilitySlot[]> {
  await prisma.$transaction(async (tx) => {
    await tx.teacherAvailability.deleteMany({ where: { teacherId } });
    if (slots.length > 0) {
      await tx.teacherAvailability.createMany({
        data: slots.map((s, i) => ({
          id: `avl_${teacherId}_${s.dayOfWeek}_${s.startHour}_${i}`,
          teacherId,
          dayOfWeek: s.dayOfWeek,
          startHour: s.startHour,
          endHour: s.endHour,
        })),
      });
    }
  });
  return getAvailability(teacherId);
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

export async function hasBookedLesson(
  teacherId: string,
  studentId: string,
): Promise<boolean> {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  const count = await prisma.booking.count({
    where: {
      teacherId,
      status: { in: ["pending_payment", "confirmed"] },
      OR: [
        { studentId },
        ...(student?.email ? [{ guestEmail: student.email }] : []),
      ],
    },
  });
  return count > 0;
}

/** @deprecated use hasBookedLesson */
export async function hasConfirmedLesson(
  teacherId: string,
  studentId: string,
): Promise<boolean> {
  return hasBookedLesson(teacherId, studentId);
}

export async function getOrCreateChatThread(
  teacherId: string,
  studentId: string,
): Promise<ChatThread> {
  const existing = await prisma.chatThread.findUnique({
    where: { teacherId_studentId: { teacherId, studentId } },
  });
  if (existing) {
    return {
      id: existing.id,
      teacherId: existing.teacherId,
      studentId: existing.studentId,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: existing.updatedAt.toISOString(),
    };
  }
  const created = await prisma.chatThread.create({
    data: {
      id: uid("cth"),
      teacherId,
      studentId,
    },
  });
  return {
    id: created.id,
    teacherId: created.teacherId,
    studentId: created.studentId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function getChatThread(id: string): Promise<ChatThread | undefined> {
  const row = await prisma.chatThread.findUnique({ where: { id } });
  if (!row) return undefined;
  return {
    id: row.id,
    teacherId: row.teacherId,
    studentId: row.studentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listChatThreadsForUser(user: {
  id: string;
  role: Role;
  teacherId?: string;
}): Promise<ChatThread[]> {
  const where =
    user.role === "teacher" && user.teacherId
      ? { teacherId: user.teacherId }
      : user.role === "student"
        ? { studentId: user.id }
        : { id: "__none__" };
  const rows = await prisma.chatThread.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    teacherId: row.teacherId,
    studentId: row.studentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getChatMessages(
  threadId: string,
  afterIso?: string,
): Promise<ChatMessage[]> {
  const rows = await prisma.chatMessage.findMany({
    where: {
      threadId,
      ...(afterIso ? { createdAt: { gt: new Date(afterIso) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return rows.map(toChatMessage);
}

function toChatMessage(row: {
  id: string;
  threadId: string;
  senderId: string;
  originalText: string;
  originalLang: string;
  translatedText: string;
  translatedLang: string;
  audioUrl: string | null;
  translatedAudioUrl: string | null;
  createdAt: Date;
}): ChatMessage {
  return {
    id: row.id,
    threadId: row.threadId,
    senderId: row.senderId,
    originalText: row.originalText,
    originalLang: row.originalLang as "en" | "ar",
    translatedText: row.translatedText,
    translatedLang: row.translatedLang as "en" | "ar",
    audioUrl: row.audioUrl || undefined,
    translatedAudioUrl: row.translatedAudioUrl || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function addChatMessage(
  message: ChatMessage,
): Promise<ChatMessage> {
  const row = await prisma.chatMessage.create({
    data: {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      originalText: message.originalText,
      originalLang: message.originalLang,
      translatedText: message.translatedText,
      translatedLang: message.translatedLang,
      audioUrl: message.audioUrl || null,
      translatedAudioUrl: message.translatedAudioUrl || null,
      createdAt: new Date(message.createdAt),
    },
  });
  await prisma.chatThread.update({
    where: { id: message.threadId },
    data: { updatedAt: new Date() },
  });
  return toChatMessage(row);
}

export async function clearChatMessages(threadId: string): Promise<number> {
  const result = await prisma.chatMessage.deleteMany({ where: { threadId } });
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
  return result.count;
}

export async function getChatMessageById(id: string) {
  const row = await prisma.chatMessage.findUnique({ where: { id } });
  if (!row) return null;
  return toChatMessage(row);
}

export async function setChatMessageTranslatedAudioUrl(
  id: string,
  translatedAudioUrl: string,
): Promise<ChatMessage | null> {
  const row = await prisma.chatMessage.update({
    where: { id },
    data: { translatedAudioUrl },
  });
  return toChatMessage(row);
}

export async function patchChatMessage(
  id: string,
  patch: {
    audioUrl?: string | null;
    translatedText?: string;
    translatedLang?: "en" | "ar";
    translatedAudioUrl?: string | null;
  },
): Promise<ChatMessage | null> {
  const data: {
    audioUrl?: string | null;
    translatedText?: string;
    translatedLang?: string;
    translatedAudioUrl?: string | null;
  } = {};
  if (patch.audioUrl !== undefined) data.audioUrl = patch.audioUrl;
  if (patch.translatedText !== undefined) data.translatedText = patch.translatedText;
  if (patch.translatedLang !== undefined) data.translatedLang = patch.translatedLang;
  if (patch.translatedAudioUrl !== undefined) {
    data.translatedAudioUrl = patch.translatedAudioUrl;
  }
  if (!Object.keys(data).length) {
    return getChatMessageById(id);
  }
  try {
    const row = await prisma.chatMessage.update({
      where: { id },
      data,
    });
    return toChatMessage(row);
  } catch {
    return null;
  }
}

export async function deleteChatMessage(id: string): Promise<boolean> {
  const row = await prisma.chatMessage.findUnique({ where: { id } });
  if (!row) return false;
  await prisma.chatMessage.delete({ where: { id } });
  await prisma.chatThread.update({
    where: { id: row.threadId },
    data: { updatedAt: new Date() },
  });
  return true;
}

export async function listStudentTeacherPairs(studentId: string): Promise<
  { teacherId: string }[]
> {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  const rows = await prisma.booking.findMany({
    where: {
      status: { in: ["pending_payment", "confirmed"] },
      OR: [
        { studentId },
        ...(student?.email ? [{ guestEmail: student.email }] : []),
      ],
    },
    distinct: ["teacherId"],
    select: { teacherId: true },
  });
  return rows;
}

export async function listTeacherStudentPairs(teacherId: string): Promise<
  { studentId: string }[]
> {
  const rows = await prisma.booking.findMany({
    where: {
      teacherId,
      status: { in: ["pending_payment", "confirmed"] },
      studentId: { not: null },
    },
    distinct: ["studentId"],
    select: { studentId: true },
  });
  return rows
    .filter((r): r is { studentId: string } => !!r.studentId)
    .map((r) => ({ studentId: r.studentId }));
}

export async function linkGuestBookingsToStudent(student: {
  id: string;
  email?: string;
}): Promise<number> {
  if (!student.email) return 0;
  const result = await prisma.booking.updateMany({
    where: {
      guestEmail: student.email.toLowerCase(),
      studentId: null,
      status: { in: ["pending_payment", "confirmed"] },
    },
    data: { studentId: student.id },
  });
  return result.count;
}

export async function createPasswordResetToken(input: {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { userId: input.userId } });
  await prisma.passwordResetToken.create({
    data: {
      id: input.id,
      userId: input.userId,
      token: input.token,
      expiresAt: new Date(input.expiresAt),
    },
  });
}

export async function consumePasswordResetToken(
  token: string,
): Promise<string | null> {
  const row = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: row.id } });
    return null;
  }
  await prisma.passwordResetToken.delete({ where: { id: row.id } });
  return row.userId;
}

function parseIceList(raw: string): Array<{
  candidate?: string | null;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}> {
  try {
  const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed as Array<{
          candidate?: string | null;
          sdpMid?: string | null;
          sdpMLineIndex?: number | null;
        }>)
      : [];
  } catch {
    return [];
  }
}

function toLessonCall(row: {
  id: string;
  threadId: string;
  status: string;
  offerSdp: string | null;
  answerSdp: string | null;
  offerIce: string;
  answerIce: string;
  startedById: string;
  updatedAt: Date;
}): LessonCallState {
  return {
    id: row.id,
    threadId: row.threadId,
    status: row.status as LessonCallStatus,
    offerSdp: row.offerSdp || undefined,
    answerSdp: row.answerSdp || undefined,
    offerIce: parseIceList(row.offerIce),
    answerIce: parseIceList(row.answerIce),
    startedById: row.startedById,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getLessonCall(
  threadId: string,
): Promise<LessonCallState | undefined> {
  const row = await prisma.lessonCall.findUnique({ where: { threadId } });
  return row ? toLessonCall(row) : undefined;
}

export async function resetLessonCallOffer(input: {
  threadId: string;
  startedById: string;
  offerSdp: string;
}): Promise<LessonCallState> {
  const row = await prisma.lessonCall.upsert({
    where: { threadId: input.threadId },
    create: {
      id: uid("lcall"),
      threadId: input.threadId,
      status: "waiting",
      offerSdp: input.offerSdp,
      answerSdp: null,
      offerIce: "[]",
      answerIce: "[]",
      startedById: input.startedById,
    },
    update: {
      status: "waiting",
      offerSdp: input.offerSdp,
      answerSdp: null,
      offerIce: "[]",
      answerIce: "[]",
      startedById: input.startedById,
    },
  });
  return toLessonCall(row);
}

export async function setLessonCallAnswer(
  threadId: string,
  answerSdp: string,
): Promise<LessonCallState | undefined> {
  const existing = await prisma.lessonCall.findUnique({ where: { threadId } });
  if (!existing) return undefined;
  const row = await prisma.lessonCall.update({
    where: { threadId },
    data: { answerSdp, status: "ringing" },
  });
  return toLessonCall(row);
}

export async function appendLessonCallIce(
  threadId: string,
  side: "offer" | "answer",
  candidate: {
    candidate?: string | null;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  },
): Promise<LessonCallState | undefined> {
  const existing = await prisma.lessonCall.findUnique({ where: { threadId } });
  if (!existing) return undefined;
  const field = side === "offer" ? "offerIce" : "answerIce";
  const list = parseIceList(existing[field]);
  list.push(candidate);
  const row = await prisma.lessonCall.update({
    where: { threadId },
    data: { [field]: JSON.stringify(list) },
  });
  return toLessonCall(row);
}

export async function markLessonCallLive(
  threadId: string,
): Promise<LessonCallState | undefined> {
  const existing = await prisma.lessonCall.findUnique({ where: { threadId } });
  if (!existing) return undefined;
  const row = await prisma.lessonCall.update({
    where: { threadId },
    data: { status: "live" },
  });
  return toLessonCall(row);
}

export async function endLessonCall(
  threadId: string,
): Promise<LessonCallState | undefined> {
  const existing = await prisma.lessonCall.findUnique({ where: { threadId } });
  if (!existing) return undefined;
  const row = await prisma.lessonCall.update({
    where: { threadId },
    data: {
      status: "ended",
      offerSdp: null,
      answerSdp: null,
      offerIce: "[]",
      answerIce: "[]",
    },
  });
  return toLessonCall(row);
}


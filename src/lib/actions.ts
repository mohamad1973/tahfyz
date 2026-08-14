"use server";

import { z } from "zod";
import {
  addBooking,
  addChatMessage,
  addNotification,
  addUser,
  clearChatMessages,
  createTeacher,
  deleteChatMessage,
  expireStaleHolds,
  getAvailability,
  getBookingById,
  getBookings,
  getChatMessageById,
  getChatMessages,
  getChatThread,
  getOrCreateChatThread,
  getTeacher,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  hasBookedLesson,
  linkGuestBookingsToStudent,
  listStudentTeacherPairs,
  listTeacherStudentPairs,
  replaceAvailability,
  updateBooking,
  updateTeacher,
  updateUser,
} from "./store";
import {
  HOLD_HOURS,
  fullWeekAvailabilityTemplate,
  hashPassword,
  isValidUsername,
  normalizeUsername,
  uid,
  usernameFromEmail,
  verifyPassword,
} from "./utils";
import { translateText, type ChatLang } from "./translate";
import { transcribeAudioUrl } from "./groq-stt";
import { buildCalendarWeek, buildOpenSlots } from "./slots";
import {
  clearSession,
  dashboardPath,
  getSession,
  requireSession,
  setSession,
} from "./auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MediaItem, PaymentMethod } from "./types";
import { isStripeConfigured, stripeCheckoutUrl } from "./stripe";

const bookingSchema = z.object({
  teacherId: z.string().min(1),
  slotStart: z.string().min(1),
  slotEnd: z.string().min(1),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  phone: z.string().min(6),
  whatsapp: z.string().min(6),
  timezone: z.string().min(1),
  notes: z.string().optional(),
});

export async function getTeacherOpenSlots(
  teacherId: string,
  viewerTz?: string,
) {
  await expireStaleHolds();
  const availability = await getAvailability(teacherId);
  const bookings = await getBookings({ teacherId });
  return buildOpenSlots({
    availability,
    bookings,
    viewerTz: viewerTz || "America/New_York",
    days: 28,
  });
}

export async function getTeacherCalendarWeek(
  teacherId: string,
  weekOffset = 0,
  viewerTz?: string,
) {
  await expireStaleHolds();
  const availability = await getAvailability(teacherId);
  const bookings = await getBookings({ teacherId });
  return buildCalendarWeek({
    availability,
    bookings,
    weekOffset,
    viewerTz: viewerTz || "America/New_York",
  });
}

export async function createGuestBooking(input: z.infer<typeof bookingSchema>) {
  await expireStaleHolds();
  const parsed = bookingSchema.parse(input);
  const teacher = await getTeacher(parsed.teacherId);
  if (!teacher || !teacher.active) {
    return { ok: false as const, error: "Teacher not found" };
  }

  const open = await getTeacherOpenSlots(parsed.teacherId, parsed.timezone);
  const match = open.find((s) => s.start === parsed.slotStart);
  if (!match) {
    return {
      ok: false as const,
      error: "That time is no longer available. Please pick another slot.",
    };
  }

  const holdExpiresAt = new Date(
    Date.now() + HOLD_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const email = parsed.guestEmail.toLowerCase();
  let studentId: string | undefined;
  const session = await getSession();
  if (session?.role === "student") {
    studentId = session.userId;
  } else {
    const existing = await getUserByEmail(email);
    if (existing?.role === "student") studentId = existing.id;
  }

  const booking = await addBooking({
    id: uid("bk"),
    teacherId: parsed.teacherId,
    slotStart: parsed.slotStart,
    slotEnd: parsed.slotEnd,
    guestName: parsed.guestName,
    guestEmail: email,
    phone: parsed.phone,
    whatsapp: parsed.whatsapp,
    timezone: parsed.timezone,
    notes: parsed.notes,
    status: "pending_payment",
    holdExpiresAt,
    createdAt: new Date().toISOString(),
    amountUsd: teacher.priceUsd ?? 25,
    paymentMethod: "manual",
    studentId,
  });

  revalidatePath("/admin");
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${parsed.teacherId}`);
  revalidatePath("/teacher");
  revalidatePath("/student");
  return {
    ok: true as const,
    bookingId: booking.id,
    amountUsd: booking.amountUsd,
    studentLinked: Boolean(studentId),
  };
}

async function finalizeBookingPayment(
  bookingId: string,
  method: PaymentMethod,
  notifyAdminId?: string,
) {
  await expireStaleHolds();
  const booking = await getBookingById(bookingId);
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (booking.status !== "pending_payment") {
    return { ok: false as const, error: "Booking is not awaiting payment" };
  }

  let student = await getUserByEmail(booking.guestEmail);
  let tempPassword: string | undefined;
  if (!student) {
    tempPassword = `Tahfyz-${booking.id.slice(-6)}`;
    let username = usernameFromEmail(booking.guestEmail);
    if (await getUserByUsername(username)) {
      username = `${username}_${uid("u").slice(-6)}`.slice(0, 32);
    }
    student = await addUser({
      id: uid("usr"),
      username,
      email: booking.guestEmail,
      passwordHash: await hashPassword(tempPassword),
      name: booking.guestName,
      role: "student",
      phone: booking.phone,
      whatsapp: booking.whatsapp,
      mustSetPassword: true,
      createdAt: new Date().toISOString(),
    });
  } else if (student.role !== "student" && student.role !== "parent") {
    return {
      ok: false as const,
      error: "Email belongs to a staff account",
    };
  }

  await updateBooking(bookingId, {
    status: "confirmed",
    studentId: student.id,
    confirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    paymentMethod: method,
  });

  const teacher = await getTeacher(booking.teacherId);
  const teacherUserId = teacher?.userId;
  if (teacherUserId) {
    await addNotification({
      id: uid("ntf"),
      userId: teacherUserId,
      title: "New confirmed lesson",
      body: `${booking.guestName} booked a 1-hour lesson on ${new Date(booking.slotStart).toUTCString()}. Paid via ${method}.`,
      read: false,
      createdAt: new Date().toISOString(),
      bookingId: booking.id,
    });
  }

  const adminId =
    notifyAdminId || (await getUserByUsername("admin"))?.id;
  if (adminId) {
    await addNotification({
      id: uid("ntf"),
      userId: adminId,
      title: "Payment confirmed",
      body: tempPassword
        ? `Account ${student.username}. Temp password: ${tempPassword}`
        : `Linked existing account ${student.username}`,
      read: false,
      createdAt: new Date().toISOString(),
      bookingId: booking.id,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
  revalidatePath(`/teachers/${booking.teacherId}`);
  revalidatePath(`/booking/${bookingId}/pay`);

  return {
    ok: true as const,
    studentEmail: student.email,
    studentUsername: student.username,
    tempPassword,
    mustSetPassword: !!student.mustSetPassword,
  };
}

export async function confirmPayment(bookingId: string) {
  const { user: admin } = await requireSession(["admin"]);
  return finalizeBookingPayment(bookingId, "manual", admin.id);
}

/** Demo card payment (no Stripe keys) — confirms booking immediately */
export async function payBookingByCardDemo(bookingId: string) {
  return finalizeBookingPayment(bookingId, "card");
}

/** Start Stripe Checkout when keys are configured; otherwise use demo pay page */
export async function startCardCheckout(bookingId: string) {
  const booking = await getBookingById(bookingId);
  if (!booking || booking.status !== "pending_payment") {
    return { ok: false as const, error: "Booking not available for payment" };
  }
  const teacher = await getTeacher(booking.teacherId);
  if (!teacher) return { ok: false as const, error: "Teacher not found" };

  if (!isStripeConfigured()) {
    return { ok: true as const, mode: "demo" as const, bookingId };
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = await stripeCheckoutUrl({
    bookingId,
    amountUsd: booking.amountUsd,
    teacherName: teacher.name,
    customerEmail: booking.guestEmail,
    successUrl: `${origin}/booking/${bookingId}/pay?paid=1`,
    cancelUrl: `${origin}/booking/${bookingId}/pay?canceled=1`,
  });
  if (!url) return { ok: false as const, error: "Could not start checkout" };
  return { ok: true as const, mode: "stripe" as const, url };
}

export async function completeStripeReturn(bookingId: string) {
  // Client lands here after Stripe success; finalize if still pending
  const booking = await getBookingById(bookingId);
  if (!booking) return { ok: false as const, error: "Not found" };
  if (booking.status === "confirmed") {
    return { ok: true as const, already: true as const };
  }
  return finalizeBookingPayment(bookingId, "card");
}

export async function cancelBooking(bookingId: string) {
  await requireSession(["admin"]);
  await updateBooking(bookingId, { status: "cancelled" });
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function loginAction(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") || ""));
  const password = String(formData.get("password") || "");
  const user = await getUserByUsername(username);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false as const, error: "Invalid username or password" };
  }
  await setSession(user);
  redirect(dashboardPath(user.role));
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function setPasswordAction(formData: FormData) {
  const { user } = await requireSession();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 6 || password !== confirm) {
    redirect("/set-password?error=1");
  }
  await updateUser(user.id, {
    passwordHash: await hashPassword(password),
    mustSetPassword: false,
  });
  revalidatePath("/");
  redirect(dashboardPath(user.role));
}

export async function linkChildAction(formData: FormData) {
  const { user } = await requireSession(["parent"]);
  const username = normalizeUsername(String(formData.get("username") || ""));
  const child = await getUserByUsername(username);
  if (!child || child.role !== "student") {
    return { ok: false as const, error: "Student username not found" };
  }
  const { addParentLink } = await import("./store");
  await addParentLink({
    id: uid("lnk"),
    parentId: user.id,
    studentId: child.id,
  });
  revalidatePath("/parent");
  return { ok: true as const };
}

export async function registerStudentAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const username = normalizeUsername(String(formData.get("username") || ""));
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") || "");
  if (!name || !username || password.length < 6) {
    return { ok: false as const, error: "Fill all fields (password 6+ chars)" };
  }
  if (!isValidUsername(username)) {
    return {
      ok: false as const,
      error: "Username: 3–32 chars, letters/numbers/_ only",
    };
  }
  if (await getUserByUsername(username)) {
    return { ok: false as const, error: "Username already taken" };
  }
  if (email && (await getUserByEmail(email))) {
    return { ok: false as const, error: "Email already registered" };
  }
  const user = await addUser({
    id: uid("usr"),
    username,
    email: email || undefined,
    passwordHash: await hashPassword(password),
    name,
    role: "student",
    createdAt: new Date().toISOString(),
  });
  await linkGuestBookingsToStudent(user);
  await setSession(user);
  redirect("/student");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  if (!email) return { ok: false as const, error: "Email required" };
  const user = await getUserByEmail(email);
  // Always return ok to avoid account enumeration, but only email if user exists
  if (user?.email) {
    const token = uid("rst") + uid("t");
    const { createPasswordResetToken } = await import("./store");
    await createPasswordResetToken({
      id: uid("prt"),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://tahfyz.vercel.app";
    const { sendPasswordResetEmail } = await import("./email");
    const sent = await sendPasswordResetEmail({
      to: user.email,
      resetUrl: `${appUrl.replace(/\/$/, "")}/reset-password?token=${token}`,
    });
    if (!sent.ok) return { ok: false as const, error: sent.error };
  }
  return {
    ok: true as const,
    message: "If that email exists, a reset link was sent.",
  };
}

export async function resetPasswordWithTokenAction(formData: FormData) {
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (!token) return { ok: false as const, error: "Invalid token" };
  if (password.length < 6 || password !== confirm) {
    return { ok: false as const, error: "Password must match (6+ chars)" };
  }
  const { consumePasswordResetToken } = await import("./store");
  const userId = await consumePasswordResetToken(token);
  if (!userId) return { ok: false as const, error: "Link expired or invalid" };
  await updateUser(userId, {
    passwordHash: await hashPassword(password),
    mustSetPassword: false,
  });
  return { ok: true as const };
}

export async function registerParentAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") || "");
  let username = normalizeUsername(String(formData.get("username") || ""));
  if (!username && email) username = usernameFromEmail(email);
  if (!name || !username || password.length < 6) {
    return { ok: false as const, error: "Fill all fields (password 6+ chars)" };
  }
  if (!isValidUsername(username)) {
    return {
      ok: false as const,
      error: "Username: 3–32 chars, letters/numbers/_ only",
    };
  }
  if (await getUserByUsername(username)) {
    return { ok: false as const, error: "Username already taken" };
  }
  if (email && (await getUserByEmail(email))) {
    return { ok: false as const, error: "Email already registered" };
  }
  const user = await addUser({
    id: uid("usr"),
    username,
    email: email || undefined,
    passwordHash: await hashPassword(password),
    name,
    role: "parent",
    createdAt: new Date().toISOString(),
  });
  await setSession(user);
  redirect("/parent");
}

async function resolveManagedTeacherId(
  actor: { role: string; teacherId?: string },
  requestedTeacherId?: string | null,
): Promise<{ ok: true; teacherId: string } | { ok: false; error: string }> {
  if (actor.role === "admin") {
    const teacherId = requestedTeacherId?.trim();
    if (!teacherId) return { ok: false, error: "Teacher id required" };
    const teacher = await getTeacher(teacherId);
    if (!teacher) return { ok: false, error: "Teacher not found" };
    return { ok: true, teacherId };
  }
  if (actor.role === "teacher" && actor.teacherId) {
    if (requestedTeacherId && requestedTeacherId !== actor.teacherId) {
      return { ok: false, error: "Not authorized" };
    }
    return { ok: true, teacherId: actor.teacherId };
  }
  return { ok: false, error: "Not authorized" };
}

export async function updateTeacherProfileAction(formData: FormData) {
  const { user } = await requireSession(["teacher", "admin"]);
  const resolved = await resolveManagedTeacherId(
    user,
    String(formData.get("teacherId") || "") || user.teacherId,
  );
  if (!resolved.ok) return { ok: false as const, error: resolved.error };
  const teacherId = resolved.teacherId;

  const name = String(formData.get("name") || "").trim();
  const nameAr = String(formData.get("nameAr") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const bioAr = String(formData.get("bioAr") || "").trim();
  const subjectsRaw = String(formData.get("subjects") || "");
  const subjects = subjectsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const priceRaw = Number(formData.get("priceUsd"));
  const priceUsd =
    Number.isFinite(priceRaw) && priceRaw > 0 ? priceRaw : undefined;
  const activeValues = formData.getAll("active").map(String);
  const active =
    activeValues.length === 0
      ? undefined
      : activeValues.includes("true") || activeValues.includes("on");

  await updateTeacher(teacherId, {
    name: name || undefined,
    nameAr: nameAr || undefined,
    bio: bio || undefined,
    bioAr: bioAr || undefined,
    subjects: subjects.length ? subjects : undefined,
    priceUsd,
    active,
  });

  const teacher = await getTeacher(teacherId);
  if (name && teacher?.userId) {
    await updateUser(teacher.userId, { name });
  }

  revalidatePath("/teacher");
  revalidatePath("/admin");
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${teacherId}`);
  return { ok: true as const };
}

function isBlobUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host === "public.blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

export async function saveTeacherPhotoUrlAction(input: {
  url: string;
  teacherId?: string;
}) {
  const { user } = await requireSession(["teacher", "admin"]);
  const resolved = await resolveManagedTeacherId(user, input.teacherId);
  if (!resolved.ok) return { ok: false as const, error: resolved.error };
  if (!input.url || !isBlobUrl(input.url)) {
    return { ok: false as const, error: "Invalid photo URL" };
  }
  await updateTeacher(resolved.teacherId, { photoUrl: input.url });
  revalidatePath("/teacher");
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${resolved.teacherId}`);
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${resolved.teacherId}`);
  return { ok: true as const, url: input.url };
}

export async function saveTeacherMediaUrlAction(input: {
  kind: "video" | "audio";
  title: string;
  url: string;
  teacherId?: string;
}) {
  const { user } = await requireSession(["teacher", "admin"]);
  const resolved = await resolveManagedTeacherId(user, input.teacherId);
  if (!resolved.ok) return { ok: false as const, error: resolved.error };
  const teacherId = resolved.teacherId;
  const title = input.title.trim() || "Untitled";
  if (input.kind !== "video" && input.kind !== "audio") {
    return { ok: false as const, error: "Invalid media type" };
  }
  if (!input.url || !isBlobUrl(input.url)) {
    return { ok: false as const, error: "Invalid media URL" };
  }

  const teacher = await getTeacher(teacherId);
  if (!teacher) return { ok: false as const, error: "Teacher not found" };

  const item: MediaItem = { id: uid("med"), title, url: input.url };
  if (input.kind === "video") {
    await updateTeacher(teacherId, { videos: [...(teacher.videos || []), item] });
  } else {
    await updateTeacher(teacherId, { audios: [...(teacher.audios || []), item] });
  }

  revalidatePath("/teacher");
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath(`/teachers/${teacherId}`);
  return { ok: true as const };
}

export async function deleteTeacherMediaAction(formData: FormData) {
  const { user } = await requireSession(["teacher", "admin"]);
  const resolved = await resolveManagedTeacherId(
    user,
    String(formData.get("teacherId") || "") || user.teacherId,
  );
  if (!resolved.ok) return { ok: false as const, error: resolved.error };
  const teacherId = resolved.teacherId;
  const kind = String(formData.get("kind") || "");
  const mediaId = String(formData.get("mediaId") || "");
  const teacher = await getTeacher(teacherId);
  if (!teacher) return { ok: false as const, error: "Not found" };

  if (kind === "video") {
    await updateTeacher(teacherId, {
      videos: (teacher.videos || []).filter((m) => m.id !== mediaId),
    });
  } else if (kind === "audio") {
    await updateTeacher(teacherId, {
      audios: (teacher.audios || []).filter((m) => m.id !== mediaId),
    });
  } else {
    return { ok: false as const, error: "Invalid kind" };
  }

  revalidatePath("/teacher");
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath(`/teachers/${teacherId}`);
  return { ok: true as const };
}

export async function updateAccountCredentialsAction(formData: FormData) {
  const { user: actor } = await requireSession(["teacher", "admin"]);
  const targetUserId = String(formData.get("userId") || "").trim() || actor.id;
  const username = normalizeUsername(String(formData.get("username") || ""));
  const emailRaw = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const currentPassword = String(formData.get("currentPassword") || "");

  const target = await getUserById(targetUserId);
  if (!target) return { ok: false as const, error: "User not found" };

  if (actor.role === "teacher") {
    if (target.id !== actor.id) {
      return { ok: false as const, error: "Not authorized" };
    }
    if (!(await verifyPassword(currentPassword, actor.passwordHash))) {
      return { ok: false as const, error: "Current password is wrong" };
    }
  } else if (actor.role === "admin") {
    if (target.role !== "teacher" && target.id !== actor.id) {
      return { ok: false as const, error: "Can only edit teacher accounts" };
    }
  }

  if (!isValidUsername(username)) {
    return {
      ok: false as const,
      error: "Username: 3–32 chars, letters/numbers/_ only",
    };
  }
  const taken = await getUserByUsername(username);
  if (taken && taken.id !== target.id) {
    return { ok: false as const, error: "Username already taken" };
  }
  if (emailRaw) {
    const emailTaken = await getUserByEmail(emailRaw);
    if (emailTaken && emailTaken.id !== target.id) {
      return { ok: false as const, error: "Email already used" };
    }
  }
  if (password) {
    if (password.length < 6 || password !== confirm) {
      return { ok: false as const, error: "Password must match (6+ chars)" };
    }
  }

  await updateUser(target.id, {
    username,
    email: emailRaw || undefined,
    passwordHash: password ? await hashPassword(password) : undefined,
  });

  if (target.id === actor.id) {
    const refreshed = await getUserById(actor.id);
    if (refreshed) await setSession(refreshed);
  }

  revalidatePath("/teacher");
  revalidatePath("/admin/teachers");
  return { ok: true as const };
}

export async function updateTeacherAvailabilityAction(formData: FormData) {
  const { user } = await requireSession(["teacher", "admin"]);
  const resolved = await resolveManagedTeacherId(
    user,
    String(formData.get("teacherId") || "") || user.teacherId,
  );
  if (!resolved.ok) return { ok: false as const, error: resolved.error };

  const raw = String(formData.get("slotsJson") || "[]");
  let parsed: { dayOfWeek: number; startHour: number; endHour: number }[] = [];
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { ok: false as const, error: "Invalid schedule data" };
  }

  const slots = parsed.filter(
    (s) =>
      Number.isInteger(s.dayOfWeek) &&
      s.dayOfWeek >= 0 &&
      s.dayOfWeek <= 6 &&
      Number.isInteger(s.startHour) &&
      Number.isInteger(s.endHour) &&
      s.startHour >= 0 &&
      s.endHour > s.startHour &&
      s.endHour <= 24,
  );

  await replaceAvailability(resolved.teacherId, slots);
  revalidatePath("/teacher");
  revalidatePath(`/admin/teachers/${resolved.teacherId}`);
  revalidatePath(`/teachers/${resolved.teacherId}`);
  return { ok: true as const };
}

export async function createTeacherAccountAction(formData: FormData) {
  await requireSession(["admin"]);
  const name = String(formData.get("name") || "").trim();
  const nameAr = String(formData.get("nameAr") || "").trim();
  const username = normalizeUsername(String(formData.get("username") || ""));
  const password = String(formData.get("password") || "");
  const priceRaw = Number(formData.get("priceUsd"));
  const priceUsd =
    Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(priceRaw) : 25;

  if (!name || !nameAr) {
    return { ok: false as const, error: "Name required (EN + AR)" };
  }
  if (!isValidUsername(username)) {
    return {
      ok: false as const,
      error: "Username: 3–32 chars, letters/numbers/_ only",
    };
  }
  if (password.length < 6) {
    return { ok: false as const, error: "Password 6+ chars" };
  }
  if (await getUserByUsername(username)) {
    return { ok: false as const, error: "Username already taken" };
  }

  const teacherId = uid("tch");
  const userId = uid("usr");
  await addUser({
    id: userId,
    username,
    passwordHash: await hashPassword(password),
    name,
    role: "teacher",
    teacherId,
    createdAt: new Date().toISOString(),
  });
  await createTeacher({
    id: teacherId,
    name,
    nameAr,
    photoUrl: "/teachers/teacher-01.png",
    bio: "",
    bioAr: "",
    subjects: ["Quran Memorization"],
    priceUsd,
    userId,
    active: true,
  });
  await replaceAvailability(teacherId, fullWeekAvailabilityTemplate());

  revalidatePath("/admin/teachers");
  revalidatePath("/teachers");
  return { ok: true as const, teacherId };
}

export async function setTeacherActiveAction(formData: FormData) {
  await requireSession(["admin"]);
  const teacherId = String(formData.get("teacherId") || "");
  const active = String(formData.get("active") || "") === "true";
  if (!(await getTeacher(teacherId))) {
    return { ok: false as const, error: "Not found" };
  }
  await updateTeacher(teacherId, { active });
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath("/teachers");
  return { ok: true as const };
}

export async function openChatWithTeacherAction(teacherId: string) {
  const { user } = await requireSession(["student"]);
  // Link any guest bookings that used this student's email
  await linkGuestBookingsToStudent(user);
  if (!(await hasBookedLesson(teacherId, user.id))) {
    return {
      ok: false as const,
      error: "Book a lesson with this teacher first (payment not required)",
    };
  }
  if (!(await getTeacher(teacherId))) {
    return { ok: false as const, error: "Teacher not found" };
  }
  const thread = await getOrCreateChatThread(teacherId, user.id);
  return { ok: true as const, threadId: thread.id };
}

export async function openChatWithStudentAction(studentId: string) {
  const { user } = await requireSession(["teacher"]);
  const teacherId = user.teacherId!;
  if (!(await hasBookedLesson(teacherId, studentId))) {
    return {
      ok: false as const,
      error: "Student needs a booking with you first (payment not required)",
    };
  }
  const student = await getUserById(studentId);
  if (!student || student.role !== "student") {
    return { ok: false as const, error: "Student not found" };
  }
  const thread = await getOrCreateChatThread(teacherId, studentId);
  return { ok: true as const, threadId: thread.id };
}

export async function fetchChatMessagesAction(
  threadId: string,
  afterIso?: string,
) {
  const { user } = await requireSession(["student", "teacher"]);
  const thread = await getChatThread(threadId);
  if (!thread) return { ok: false as const, error: "Chat not found" };
  const allowed =
    (user.role === "student" && thread.studentId === user.id) ||
    (user.role === "teacher" && thread.teacherId === user.teacherId);
  if (!allowed) return { ok: false as const, error: "Not authorized" };
  const messages = await getChatMessages(threadId, afterIso);
  return { ok: true as const, messages };
}

export async function sendChatMessageAction(input: {
  threadId: string;
  text: string;
  originalLang: ChatLang;
  audioUrl?: string;
}) {
  const { user } = await requireSession(["student", "teacher"]);
  const thread = await getChatThread(input.threadId);
  if (!thread) return { ok: false as const, error: "Chat not found" };

  const allowed =
    (user.role === "student" && thread.studentId === user.id) ||
    (user.role === "teacher" && thread.teacherId === user.teacherId);
  if (!allowed) return { ok: false as const, error: "Not authorized" };

  const text = input.text.trim();
  if (!text) return { ok: false as const, error: "Empty message" };

  let originalLang: ChatLang = input.originalLang;
  if (originalLang !== "en" && originalLang !== "ar") {
    originalLang = user.role === "teacher" ? "ar" : "en";
  }
  const translatedLang: ChatLang = originalLang === "en" ? "ar" : "en";
  const translatedText = await translateText(text, originalLang, translatedLang);

  let audioUrl = input.audioUrl?.trim() || undefined;
  if (audioUrl) {
    try {
      const host = new URL(audioUrl).hostname;
      const ok =
        host.endsWith(".public.blob.vercel-storage.com") ||
        host === "public.blob.vercel-storage.com" ||
        host.endsWith(".blob.vercel-storage.com");
      if (!ok) audioUrl = undefined;
    } catch {
      audioUrl = undefined;
    }
  }

  const message = await addChatMessage({
    id: uid("cmsg"),
    threadId: thread.id,
    senderId: user.id,
    originalText: text,
    originalLang,
    translatedText,
    translatedLang,
    audioUrl,
    createdAt: new Date().toISOString(),
  });

  return { ok: true as const, message };
}

export async function transcribeChatAudioAction(input: {
  threadId: string;
  audioUrl: string;
  originalLang: ChatLang;
}) {
  const { user } = await requireSession(["student", "teacher"]);
  const thread = await getChatThread(input.threadId);
  if (!thread) return { ok: false as const, error: "Chat not found" };

  const allowed =
    (user.role === "student" && thread.studentId === user.id) ||
    (user.role === "teacher" && thread.teacherId === user.teacherId);
  if (!allowed) return { ok: false as const, error: "Not authorized" };

  let audioUrl = input.audioUrl?.trim() || "";
  if (!audioUrl) return { ok: false as const, error: "Missing audio" };

  try {
    const host = new URL(audioUrl).hostname;
    const okHost =
      host.endsWith(".public.blob.vercel-storage.com") ||
      host === "public.blob.vercel-storage.com" ||
      host.endsWith(".blob.vercel-storage.com");
    if (!okHost) {
      return { ok: false as const, error: "Invalid audio URL" };
    }
  } catch {
    return { ok: false as const, error: "Invalid audio URL" };
  }

  let originalLang: ChatLang = input.originalLang;
  if (originalLang !== "en" && originalLang !== "ar") {
    originalLang = user.role === "teacher" ? "ar" : "en";
  }

  const result = await transcribeAudioUrl(audioUrl, originalLang);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, text: result.text };
}

export async function clearChatThreadAction(threadId: string) {
  const { user } = await requireSession(["student", "teacher"]);
  const thread = await getChatThread(threadId);
  if (!thread) return { ok: false as const, error: "Chat not found" };
  const allowed =
    (user.role === "student" && thread.studentId === user.id) ||
    (user.role === "teacher" && thread.teacherId === user.teacherId);
  if (!allowed) return { ok: false as const, error: "Not authorized" };
  await clearChatMessages(threadId);
  return { ok: true as const };
}

export async function deleteChatMessageAction(messageId: string) {
  const { user } = await requireSession(["student", "teacher"]);
  const message = await getChatMessageById(messageId);
  if (!message) return { ok: false as const, error: "Message not found" };
  const thread = await getChatThread(message.threadId);
  if (!thread) return { ok: false as const, error: "Chat not found" };
  const allowed =
    (user.role === "student" && thread.studentId === user.id) ||
    (user.role === "teacher" && thread.teacherId === user.teacherId);
  if (!allowed) return { ok: false as const, error: "Not authorized" };
  await deleteChatMessage(messageId);
  return { ok: true as const };
}

export async function listMyChatPartnersAction() {
  const { user } = await requireSession(["student", "teacher"]);
  if (user.role === "student") {
    const pairs = await listStudentTeacherPairs(user.id);
    const teachers = await Promise.all(
      pairs.map(async (p) => {
        const t = await getTeacher(p.teacherId);
        return t
          ? { teacherId: t.id, name: t.name, nameAr: t.nameAr }
          : null;
      }),
    );
    return {
      ok: true as const,
      role: "student" as const,
      partners: teachers.filter(Boolean) as {
        teacherId: string;
        name: string;
        nameAr: string;
      }[],
    };
  }
  const pairs = await listTeacherStudentPairs(user.teacherId!);
  const students = await Promise.all(
    pairs.map(async (p) => {
      const s = await getUserById(p.studentId);
      return s ? { studentId: s.id, name: s.name, username: s.username } : null;
    }),
  );
  return {
    ok: true as const,
    role: "teacher" as const,
    partners: students.filter(Boolean) as {
      studentId: string;
      name: string;
      username: string;
    }[],
  };
}

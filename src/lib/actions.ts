"use server";

import { z } from "zod";
import {
  addBooking,
  addNotification,
  addUser,
  expireStaleHolds,
  getAvailability,
  getBookingById,
  getBookings,
  getTeacher,
  getUserByEmail,
  updateBooking,
  updateTeacher,
  updateUser,
} from "./store";
import { HOLD_HOURS, hashPassword, uid, verifyPassword } from "./utils";
import { buildCalendarWeek, buildOpenSlots } from "./slots";
import {
  clearSession,
  dashboardPath,
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

  const booking = await addBooking({
    id: uid("bk"),
    teacherId: parsed.teacherId,
    slotStart: parsed.slotStart,
    slotEnd: parsed.slotEnd,
    guestName: parsed.guestName,
    guestEmail: parsed.guestEmail.toLowerCase(),
    phone: parsed.phone,
    whatsapp: parsed.whatsapp,
    timezone: parsed.timezone,
    notes: parsed.notes,
    status: "pending_payment",
    holdExpiresAt,
    createdAt: new Date().toISOString(),
    amountUsd: teacher.priceUsd ?? 25,
    paymentMethod: "manual",
  });

  revalidatePath("/admin");
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${parsed.teacherId}`);
  revalidatePath("/teacher");
  return {
    ok: true as const,
    bookingId: booking.id,
    amountUsd: booking.amountUsd,
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
    student = await addUser({
      id: uid("usr"),
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
    notifyAdminId ||
    (await getUserByEmail("admin@tahfyz.com"))?.id;
  if (adminId) {
    await addNotification({
      id: uid("ntf"),
      userId: adminId,
      title: "Payment confirmed",
      body: tempPassword
        ? `Account for ${student.email}. Temp password: ${tempPassword}`
        : `Linked existing account ${student.email}`,
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
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false as const, error: "Invalid email or password" };
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
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const child = await getUserByEmail(email);
  if (!child || child.role !== "student") {
    return { ok: false as const, error: "Student account not found" };
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

export async function registerParentAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") || "");
  if (!name || !email || password.length < 6) {
    return { ok: false as const, error: "Fill all fields (password 6+ chars)" };
  }
  if (await getUserByEmail(email)) {
    return { ok: false as const, error: "Email already registered" };
  }
  const user = await addUser({
    id: uid("usr"),
    email,
    passwordHash: await hashPassword(password),
    name,
    role: "parent",
    createdAt: new Date().toISOString(),
  });
  await setSession(user);
  redirect("/parent");
}

export async function updateTeacherProfileAction(formData: FormData) {
  const { user } = await requireSession(["teacher"]);
  const teacherId = user.teacherId!;
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

  await updateTeacher(teacherId, {
    name: name || undefined,
    nameAr: nameAr || undefined,
    bio: bio || undefined,
    bioAr: bioAr || undefined,
    subjects: subjects.length ? subjects : undefined,
    priceUsd,
  });

  if (name) {
    await updateUser(user.id, { name });
  }

  revalidatePath("/teacher");
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

export async function saveTeacherPhotoUrlAction(url: string) {
  const { user } = await requireSession(["teacher"]);
  const teacherId = user.teacherId!;
  if (!url || !isBlobUrl(url)) {
    return { ok: false as const, error: "Invalid photo URL" };
  }
  await updateTeacher(teacherId, { photoUrl: url });
  revalidatePath("/teacher");
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${teacherId}`);
  return { ok: true as const, url };
}

export async function saveTeacherMediaUrlAction(input: {
  kind: "video" | "audio";
  title: string;
  url: string;
}) {
  const { user } = await requireSession(["teacher"]);
  const teacherId = user.teacherId!;
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
  revalidatePath(`/teachers/${teacherId}`);
  return { ok: true as const };
}

export async function deleteTeacherMediaAction(formData: FormData) {
  const { user } = await requireSession(["teacher"]);
  const teacherId = user.teacherId!;
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
  revalidatePath(`/teachers/${teacherId}`);
  return { ok: true as const };
}

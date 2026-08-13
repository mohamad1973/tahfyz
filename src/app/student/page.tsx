import { DashboardShell } from "@/components/dashboard-shell";
import { OpenTeacherChatButton } from "@/components/open-chat-button";
import { requireSession } from "@/lib/auth";
import {
  getBookings,
  getTeachers,
  linkGuestBookingsToStudent,
  listStudentTeacherPairs,
} from "@/lib/store";
import { formatSlotRange } from "@/lib/slots";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const { user } = await requireSession(["student"]);
  await linkGuestBookingsToStudent(user);
  const bookings = await getBookings({ studentId: user.id });
  // Also show guest bookings by email that may not have studentId yet (just linked)
  const teachers = await getTeachers({ includeInactive: true });
  const map = Object.fromEntries(teachers.map((t) => [t.id, t.name]));
  const mapAr = Object.fromEntries(teachers.map((t) => [t.id, t.nameAr]));
  const academyWa = process.env.NEXT_PUBLIC_ACADEMY_WHATSAPP || "201000000001";
  const chatPartners = await listStudentTeacherPairs(user.id);

  return (
    <DashboardShell role="student">
      <h1 className="font-display text-3xl text-olive-deep">
        Welcome, {user.name}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Your confirmed lessons appear here after academy payment confirmation.
      </p>

      <a
        href={`https://wa.me/${academyWa.replace(/^\+/, "")}`}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex rounded-xl bg-ok px-4 py-2 text-sm font-semibold text-card"
      >
        WhatsApp Tahfyz academy
      </a>

      <section className="mt-10">
        <h2 className="font-display text-xl">Lesson chat</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Speak English — see English text + Arabic translation. Chat unlocks
          after you book a lesson (payment not required). Use the same email
          when booking and registering.
        </p>
        <ul className="mt-3 space-y-2">
          {chatPartners.length === 0 && (
            <li className="text-sm text-ink-muted">
              No chats yet.{" "}
              <a href="/teachers" className="underline">
                Book a teacher
              </a>{" "}
              first.
            </li>
          )}
          {chatPartners.map((p) => (
            <li
              key={p.teacherId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm"
            >
              <span className="font-medium">
                {mapAr[p.teacherId] || map[p.teacherId] || "Teacher"}
              </span>
              <OpenTeacherChatButton teacherId={p.teacherId} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">My lessons</h2>
        <ul className="mt-3 space-y-2">
          {bookings.length === 0 && (
            <li className="text-sm text-ink-muted">
              No confirmed bookings yet.{" "}
              <a href="/teachers" className="underline">
                Browse teachers
              </a>
            </li>
          )}
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-line bg-card px-4 py-3 text-sm"
            >
              <div className="font-medium">{map[b.teacherId] || "Teacher"}</div>
              <div className="text-ink-muted">
                {formatSlotRange(b.slotStart, b.slotEnd, b.timezone)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase text-ok">
                  {b.status}
                </span>
                {b.status === "confirmed" || b.status === "pending_payment" ? (
                  <OpenTeacherChatButton teacherId={b.teacherId} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}

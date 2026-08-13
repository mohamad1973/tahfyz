"use client";

import { OpenTeacherChatButton } from "@/components/open-chat-button";
import { useI18n } from "@/lib/i18n/provider";
import { formatSlotRange } from "@/lib/slots";
import type { Booking, Teacher } from "@/lib/types";

export function StudentDashboardClient({
  userName,
  bookings,
  teachers,
  chatPartners,
  academyWa,
}: {
  userName: string;
  bookings: Booking[];
  teachers: Teacher[];
  chatPartners: { teacherId: string }[];
  academyWa: string;
}) {
  const { t } = useI18n();
  const map = Object.fromEntries(teachers.map((x) => [x.id, x.name]));
  const mapAr = Object.fromEntries(teachers.map((x) => [x.id, x.nameAr]));

  return (
    <>
      <h1 className="font-display text-3xl text-olive-deep">
        Welcome, {userName}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{t.myLessons}</p>

      <a
        href={`https://wa.me/${academyWa.replace(/^\+/, "")}`}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex rounded-xl bg-ok px-4 py-2 text-sm font-semibold text-card"
      >
        WhatsApp Tahfyz
      </a>

      <section className="mt-10 rounded-2xl border-2 border-olive/40 bg-card p-5">
        <h2 className="font-display text-xl text-olive-deep">{t.lessonChat}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t.lessonChatHelpStudent}</p>
        <ul className="mt-3 space-y-2">
          {chatPartners.length === 0 && (
            <li className="text-sm text-ink-muted">{t.chatUnlock}</li>
          )}
          {chatPartners.map((p) => (
            <li
              key={p.teacherId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg px-4 py-3 text-sm"
            >
              <span className="font-medium">
                {mapAr[p.teacherId] || map[p.teacherId] || "Teacher"}
              </span>
              <OpenTeacherChatButton
                teacherId={p.teacherId}
                label={t.openChat}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">{t.myLessons}</h2>
        <ul className="mt-3 space-y-2">
          {bookings.length === 0 && (
            <li className="text-sm text-ink-muted">
              {t.chatUnlock}{" "}
              <a href="/teachers" className="underline">
                {t.browseTeachers}
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
                  <OpenTeacherChatButton
                    teacherId={b.teacherId}
                    label={t.openChat}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

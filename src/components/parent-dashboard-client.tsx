"use client";

import { LinkChildForm } from "@/components/link-child-form";
import { useI18n } from "@/lib/i18n/provider";
import { formatSlotRange } from "@/lib/slots";
import type { Booking, User } from "@/lib/types";

export function ParentDashboardClient({
  childBookings,
  teacherNames,
}: {
  childBookings: { child: User; bookings: Booking[] }[];
  teacherNames: Record<string, string>;
}) {
  const { t } = useI18n();

  return (
    <>
      <h1 className="font-display text-3xl text-olive-deep">{t.parentTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t.parentHelp}</p>

      <section className="mt-8 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-xl">{t.linkStudentAccount}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t.linkChildHelp}</p>
        <LinkChildForm />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">{t.children}</h2>
        {childBookings.length === 0 && (
          <p className="mt-2 text-sm text-ink-muted">{t.noChildren}</p>
        )}
        {childBookings.map(({ child, bookings }) => (
          <div key={child.id} className="mt-4 rounded-2xl border border-line p-4">
            <h3 className="font-semibold">
              {child.name}{" "}
              <span className="font-normal text-ink-muted">({child.username})</span>
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              {bookings.length === 0 && (
                <li className="text-ink-muted">{t.noBookings}</li>
              )}
              {bookings.map((b) => (
                <li key={b.id}>
                  {teacherNames[b.teacherId]} ·{" "}
                  {formatSlotRange(b.slotStart, b.slotEnd, b.timezone)} ·{" "}
                  <span className="font-semibold text-ok">{b.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}

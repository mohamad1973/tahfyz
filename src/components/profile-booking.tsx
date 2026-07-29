"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Teacher } from "@/lib/types";
import type { CalendarCell } from "@/lib/slots";
import { createGuestBooking } from "@/lib/actions";
import { ScheduleCalendar } from "@/components/schedule-calendar";

export function ProfileBooking({ teacher }: { teacher: Teacher }) {
  const [selected, setSelected] = useState<CalendarCell | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/New_York";

  if (bookingId) {
    return (
      <div className="rounded-2xl border border-ok/30 bg-ok/10 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-ok" />
        <p className="mt-3 font-display text-xl text-olive-deep">
          Booking request received
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Hour held on the calendar (${teacher.priceUsd}/hr). Complete payment
          next.
        </p>
        <a
          href={`/booking/${bookingId}/pay`}
          className="mt-4 inline-block rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card"
        >
          Continue to payment
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScheduleCalendar
        teacherId={teacher.id}
        selectable
        onSelect={setSelected}
        refreshKey={refreshKey}
      />
      {selected && (
        <form
          className="space-y-3 rounded-2xl border border-line bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await createGuestBooking({
                teacherId: teacher.id,
                slotStart: selected.start,
                slotEnd: selected.end,
                guestName: String(fd.get("name")),
                guestEmail: String(fd.get("email")),
                phone: String(fd.get("phone")),
                whatsapp: String(fd.get("whatsapp")),
                timezone: tz,
                notes: String(fd.get("notes") || "") || undefined,
              });
              if (!res.ok) setError(res.error);
              else {
                setRefreshKey((k) => k + 1);
                setBookingId(res.bookingId);
              }
            });
          }}
        >
          <p className="text-sm">
            <span className="font-semibold">Selected: </span>
            {selected.labelLocal} · ${teacher.priceUsd}
          </p>
          <input
            name="name"
            required
            placeholder="Full name"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
          <input
            name="phone"
            required
            placeholder="Mobile"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
          <input
            name="whatsapp"
            required
            placeholder="WhatsApp"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
          <textarea
            name="notes"
            rows={2}
            placeholder="Notes (optional)"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-olive py-2.5 text-sm font-semibold text-card disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Request this hour"}
          </button>
        </form>
      )}
    </div>
  );
}

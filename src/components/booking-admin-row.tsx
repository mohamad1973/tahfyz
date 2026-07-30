"use client";

import { useState, useTransition } from "react";
import { cancelBooking, confirmPayment } from "@/lib/actions";
import type { Booking } from "@/lib/types";
import { formatSlotRange } from "@/lib/slots";

export function BookingAdminRow({
  booking,
  teacherName,
}: {
  booking: Booking;
  teacherName: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wa = booking.whatsapp.replace(/[^\d+]/g, "");
  const waLink = `https://wa.me/${wa.replace(/^\+/, "")}`;

  return (
    <tr className="border-b border-line align-top text-sm">
      <td className="px-3 py-3">
        <div className="font-medium">{booking.guestName}</div>
        <div className="text-xs text-ink-muted">{booking.guestEmail}</div>
      </td>
      <td className="px-3 py-3">
        <a href={`tel:${booking.phone}`} className="text-olive underline">
          {booking.phone}
        </a>
        <div>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ok underline"
          >
            WhatsApp
          </a>
        </div>
      </td>
      <td className="px-3 py-3">
        <div>{teacherName}</div>
        <div className="text-xs text-ink-muted">
          {formatSlotRange(booking.slotStart, booking.slotEnd, booking.timezone)}
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={booking.status} />
        {booking.paymentMethod && (
          <div className="mt-1 text-[10px] text-ink-muted">
            دفع: {booking.paymentMethod === "card" ? "بطاقة" : "يدوي"}
            {booking.amountUsd != null ? ` · $${booking.amountUsd}` : ""}
          </div>
        )}
        {!booking.paymentMethod && booking.amountUsd != null && (
          <div className="mt-1 text-[10px] text-ink-muted">
            المبلغ: ${booking.amountUsd}
          </div>
        )}
        {booking.status === "pending_payment" && (
          <div className="mt-1 text-[10px] text-ink-muted">
            Hold until {new Date(booking.holdExpiresAt).toLocaleString()}
          </div>
        )}
        {msg && <div className="mt-1 text-xs text-ok">{msg}</div>}
        {error && <div className="mt-1 text-xs text-danger">{error}</div>}
      </td>
      <td className="px-3 py-3">
        {booking.status === "pending_payment" && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await confirmPayment(booking.id);
                  if (!res.ok) setError(res.error);
                  else
                    setMsg(
                      res.tempPassword
                        ? `تم · ${res.studentUsername || res.studentEmail} · كلمة مؤقتة: ${res.tempPassword}`
                        : `تم · مرتبط بـ ${res.studentUsername || res.studentEmail}`,
                    );
                });
              }}
              className="rounded-lg bg-ok px-2 py-1.5 text-xs font-semibold text-card disabled:opacity-60"
            >
              تأكيد التحصيل
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await cancelBooking(booking.id);
                });
              }}
              className="rounded-lg border border-line px-2 py-1.5 text-xs"
            >
              إلغاء
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: Booking["status"] }) {
  const map: Record<Booking["status"], string> = {
    pending_payment: "بانتظار الدفع",
    confirmed: "مؤكد",
    cancelled: "ملغى",
    expired: "منتهي",
  };
  const colors: Record<Booking["status"], string> = {
    pending_payment: "bg-sand-soft text-ink",
    confirmed: "bg-ok/15 text-ok",
    cancelled: "bg-danger/10 text-danger",
    expired: "bg-bg-deep text-ink-muted",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status]}`}
    >
      {map[status]}
    </span>
  );
}

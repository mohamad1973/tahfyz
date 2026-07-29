"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, MessageCircle } from "lucide-react";
import {
  completeStripeReturn,
  payBookingByCardDemo,
  startCardCheckout,
} from "@/lib/actions";
import { formatSlotRange } from "@/lib/slots";
import type { Booking } from "@/lib/types";

export function BookingPayClient({
  booking,
  teacherName,
  academyWa,
  stripeReady,
  paidQuery,
}: {
  booking: Booking;
  teacherName: string;
  academyWa: string;
  stripeReady: boolean;
  paidQuery?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(booking.status === "confirmed");
  const [tempPassword, setTempPassword] = useState<string | undefined>();

  useEffect(() => {
    if (paidQuery === "1" && booking.status === "pending_payment") {
      start(async () => {
        const res = await completeStripeReturn(booking.id);
        if (res.ok) {
          setDone(true);
          if ("tempPassword" in res) setTempPassword(res.tempPassword);
        } else if ("error" in res) setError(res.error);
      });
    }
  }, [paidQuery, booking.id, booking.status]);

  const wa = `https://wa.me/${academyWa.replace(/^\+/, "")}?text=${encodeURIComponent(
    `Hello Tahfyz, I booked ${teacherName} — booking ${booking.id} for $${booking.amountUsd}.`,
  )}`;

  if (done) {
    return (
      <div className="rounded-2xl border border-ok/30 bg-ok/10 p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-ok" />
        <h2 className="mt-3 font-display text-2xl text-olive-deep">
          Payment confirmed
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Your lesson hour is now booked on the teacher calendar. Sign in with{" "}
          <strong>{booking.guestEmail}</strong>
          {tempPassword ? (
            <>
              {" "}
              and temporary password <strong>{tempPassword}</strong>
            </>
          ) : null}
          .
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card"
        >
          Student sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-sand">
          Pending payment
        </p>
        <h1 className="mt-1 font-display text-2xl text-olive-deep">
          ${booking.amountUsd} · {teacherName}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {formatSlotRange(booking.slotStart, booking.slotEnd, booking.timezone)}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Hold expires {new Date(booking.holdExpiresAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-5 transition hover:border-olive"
        >
          <MessageCircle className="h-6 w-6 text-ok" />
          <span className="font-display text-lg">Pay via academy</span>
          <span className="text-sm text-ink-muted">
            WhatsApp Tahfyz for bank transfer or e-wallet. Admin confirms
            manually.
          </span>
        </a>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const startRes = await startCardCheckout(booking.id);
              if (!startRes.ok) {
                setError(startRes.error);
                return;
              }
              if (startRes.mode === "stripe" && startRes.url) {
                window.location.href = startRes.url;
                return;
              }
              const res = await payBookingByCardDemo(booking.id);
              if (!res.ok) setError(res.error);
              else {
                setDone(true);
                setTempPassword(res.tempPassword);
              }
            });
          }}
          className="flex flex-col gap-2 rounded-2xl border border-olive bg-olive/5 p-5 text-left transition hover:bg-olive/10 disabled:opacity-60"
        >
          <CreditCard className="h-6 w-6 text-olive" />
          <span className="font-display text-lg">
            Pay by card {stripeReady ? "" : "(demo)"}
          </span>
          <span className="text-sm text-ink-muted">
            {stripeReady
              ? "Secure Stripe Checkout."
              : "Demo mode confirms instantly. Add STRIPE_SECRET_KEY for live cards."}
          </span>
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Link href={`/teachers/${booking.teacherId}`} className="text-sm text-olive underline">
        Back to teacher
      </Link>
    </div>
  );
}

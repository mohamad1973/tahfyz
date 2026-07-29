import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BookingPayClient } from "@/components/booking-pay-client";
import { getBookingById, getTeacher } from "@/lib/store";
import { isStripeConfigured } from "@/lib/stripe";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pay for lesson" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; canceled?: string }>;
};

export default async function BookingPayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const q = await searchParams;
  const booking = await getBookingById(id);
  if (!booking) notFound();
  const teacher = await getTeacher(booking.teacherId);
  const academyWa =
    process.env.NEXT_PUBLIC_ACADEMY_WHATSAPP || "201000000001";

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <Link href="/" className="font-display text-2xl text-olive-deep">
          Tahfyz
        </Link>
        {q.canceled === "1" && (
          <p className="mt-4 rounded-xl bg-sand-soft/50 px-3 py-2 text-sm">
            Card checkout was canceled. You can try again or pay via WhatsApp.
          </p>
        )}
        <div className="mt-6">
          <BookingPayClient
            booking={booking}
            teacherName={teacher?.name || "Teacher"}
            academyWa={academyWa}
            stripeReady={isStripeConfigured()}
            paidQuery={q.paid}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

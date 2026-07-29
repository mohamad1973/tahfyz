import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TeachersGrid } from "@/components/teacher-card";
import { getTeachers } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const teachers = await getTeachers();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=1600&q=80)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/75 to-olive-deep/55" />
          <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-24">
            <p className="animate-rise font-display text-5xl font-semibold tracking-tight text-card sm:text-7xl md:text-8xl">
              Tahfyz
            </p>
            <h1 className="animate-rise delay-1 mt-4 max-w-xl font-display text-2xl font-medium text-sand-soft sm:text-3xl">
              Quran & its sciences, taught by Egyptian teachers to students abroad.
            </h1>
            <p className="animate-rise delay-2 mt-4 max-w-lg text-base text-card/80 sm:text-lg">
              Live online Hifz, Tajweed, and Arabic — for learners in America and
              Europe. Book a one-hour lesson; pay by card or via the academy.
            </p>
            <div className="animate-rise delay-3 mt-8 flex flex-wrap gap-3">
              <a
                href="#teachers"
                className="rounded-xl bg-sand px-5 py-3 text-sm font-semibold text-ink transition hover:bg-sand-soft"
              >
                Meet our teachers
              </a>
              <Link
                href="/login"
                className="rounded-xl border border-card/40 bg-card/10 px-5 py-3 text-sm font-semibold text-card backdrop-blur transition hover:bg-card/20"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="font-display text-3xl text-olive-deep sm:text-4xl">
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Simple booking for international students — no account until payment
            is confirmed.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Choose a teacher",
                d: "Browse Egyptian tutors, open a profile, and learn about each sheikh.",
              },
              {
                n: "02",
                t: "Request a slot",
                d: "Book as a guest with phone & WhatsApp. We hold the hour for 24h.",
              },
              {
                n: "03",
                t: "Pay & learn",
                d: "Pay by card (or academy WhatsApp). The calendar square locks, your account opens, and the teacher is notified.",
              },
            ].map((step) => (
              <li key={step.n} className="border-t border-line pt-4">
                <span className="font-display text-sm text-sand">{step.n}</span>
                <h3 className="mt-1 font-display text-xl text-ink">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {step.d}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="teachers"
          className="border-t border-line bg-bg-deep/30 px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl text-olive-deep sm:text-4xl">
                  Our teachers
                </h2>
                <p className="mt-2 max-w-2xl text-ink-muted">
                  Click a sheikh card to open his profile — about, videos,
                  audio, and calendar booking.
                </p>
              </div>
              <Link
                href="/teachers"
                className="text-sm font-semibold text-olive underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-10">
              <TeachersGrid teachers={teachers} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

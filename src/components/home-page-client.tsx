"use client";

import Link from "next/link";
import { TeachersGrid } from "@/components/teacher-card";
import { useI18n } from "@/lib/i18n/provider";
import type { Teacher } from "@/lib/types";

export function HomePageClient({ teachers }: { teachers: Teacher[] }) {
  const { t } = useI18n();

  const steps = [
    { n: "01", title: t.step1Title, body: t.step1Body },
    { n: "02", title: t.step2Title, body: t.step2Body },
    { n: "03", title: t.step3Title, body: t.step3Body },
  ];

  return (
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
            {t.heroHeadline}
          </h1>
          <p className="animate-rise delay-2 mt-4 max-w-lg text-base text-card/80 sm:text-lg">
            {t.heroSub}
          </p>
          <div className="animate-rise delay-3 mt-8 flex flex-wrap gap-3">
            <a
              href="#teachers"
              className="rounded-xl bg-sand px-5 py-3 text-sm font-semibold text-ink transition hover:bg-sand-soft"
            >
              {t.meetTeachers}
            </a>
            <Link
              href="/login"
              className="rounded-xl border border-card/40 bg-card/10 px-5 py-3 text-sm font-semibold text-card backdrop-blur transition hover:bg-card/20"
            >
              {t.signIn}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-display text-3xl text-olive-deep sm:text-4xl">
          {t.howItWorks}
        </h2>
        <p className="mt-2 max-w-2xl text-ink-muted">{t.howItWorksSub}</p>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="border-t border-line pt-4">
              <span className="font-display text-sm text-sand">{step.n}</span>
              <h3 className="mt-1 font-display text-xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {step.body}
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
                {t.ourTeachers}
              </h2>
              <p className="mt-2 max-w-2xl text-ink-muted">{t.ourTeachersSub}</p>
            </div>
            <Link
              href="/teachers"
              className="text-sm font-semibold text-olive underline"
            >
              {t.viewAll}
            </Link>
          </div>
          <div className="mt-10">
            <TeachersGrid teachers={teachers} />
          </div>
        </div>
      </section>
    </main>
  );
}

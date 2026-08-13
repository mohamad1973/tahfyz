"use client";

import Link from "next/link";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/provider";

export function SiteHeaderClient({
  dashboardHref,
  signedIn,
}: {
  dashboardHref?: string;
  signedIn: boolean;
}) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-display text-2xl font-semibold tracking-tight text-olive-deep"
        >
          Tahfyz
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-ink-muted sm:gap-2">
          <LanguageSwitcher className="mr-1 hidden sm:inline-flex" />
          <Link
            href="/teachers"
            className="rounded-md px-3 py-2 transition hover:bg-bg-deep hover:text-ink"
          >
            {t.teachers}
          </Link>
          {signedIn && dashboardHref ? (
            <Link
              href={dashboardHref}
              className="rounded-md bg-olive px-3 py-2 text-card transition hover:bg-olive-deep"
            >
              {t.dashboard}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-olive px-3 py-2 text-card transition hover:bg-olive-deep"
            >
              {t.signIn}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooterClient() {
  const { t } = useI18n();
  return (
    <footer className="mt-auto border-t border-line/70 bg-bg-deep/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-lg text-olive-deep">Tahfyz</p>
        <p>{t.footerTag}</p>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}

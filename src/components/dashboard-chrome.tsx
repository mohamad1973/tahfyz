"use client";

import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/provider";

export function DashboardChrome({
  roleLabelEn,
  roleLabelAr,
  userName,
}: {
  roleLabelEn: string;
  roleLabelAr?: string;
  userName: string;
}) {
  const { t, lang } = useI18n();
  const roleLabel =
    lang === "ar" && roleLabelAr
      ? `${roleLabelAr} · ${roleLabelEn}`
      : roleLabelEn;

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-olive-deep"
          >
            Tahfyz
          </Link>
          <span className="rounded-full bg-bg-deep px-3 py-1 text-xs font-semibold text-ink-muted">
            {roleLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <LanguageSwitcher />
          <span className="hidden text-ink-muted sm:inline">{userName}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-bg-deep"
            >
              {t.signOut}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

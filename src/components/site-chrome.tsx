import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dashboardPath } from "@/lib/auth";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-olive-deep">
          Tahfyz
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-ink-muted sm:gap-2">
          <Link
            href="/teachers"
            className="rounded-md px-3 py-2 transition hover:bg-bg-deep hover:text-ink"
          >
            Teachers
          </Link>
          {session ? (
            <Link
              href={dashboardPath(session.role)}
              className="rounded-md bg-olive px-3 py-2 text-card transition hover:bg-olive-deep"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-olive px-3 py-2 text-card transition hover:bg-olive-deep"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/70 bg-bg-deep/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-lg text-olive-deep">Tahfyz</p>
        <p>Egyptian teachers · Students worldwide · Manual payment via academy</p>
      </div>
    </footer>
  );
}

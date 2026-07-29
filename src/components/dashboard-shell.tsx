import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";
import { getSession, dashboardPath } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { getUserById } from "@/lib/store";
import { cn } from "@/lib/utils";

const labels: Record<Role, { en: string; ar?: string }> = {
  admin: { en: "Academy", ar: "الأكاديمية" },
  teacher: { en: "Teacher", ar: "المعلم" },
  student: { en: "Student" },
  parent: { en: "Parent" },
};

export async function DashboardShell({
  role,
  children,
  dir,
}: {
  role: Role;
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== role) redirect(dashboardPath(session.role));

  const user = await getUserById(session.userId);
  if (user?.mustSetPassword) redirect("/set-password");

  const isAr = dir === "rtl";

  return (
    <div className="flex min-h-full flex-col" dir={dir || "ltr"}>
      <header className="border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-display text-xl font-semibold text-olive-deep"
            >
              Tahfyz
            </Link>
            <span
              className={cn(
                "rounded-full bg-bg-deep px-3 py-1 text-xs font-semibold text-ink-muted",
              )}
            >
              {isAr && labels[role].ar
                ? `${labels[role].ar} · ${labels[role].en}`
                : labels[role].en}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink-muted sm:inline">{session.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-bg-deep"
              >
                {isAr ? "خروج" : "Sign out"}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

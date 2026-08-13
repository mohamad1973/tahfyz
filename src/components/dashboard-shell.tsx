import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";
import { getSession, dashboardPath } from "@/lib/auth";
import { getUserById } from "@/lib/store";
import { DashboardChrome } from "@/components/dashboard-chrome";

const labels: Record<Role, { en: string; ar?: string }> = {
  admin: { en: "Academy", ar: "الأكاديمية" },
  teacher: { en: "Teacher", ar: "المعلم" },
  student: { en: "Student", ar: "الطالب" },
  parent: { en: "Parent", ar: "ولي الأمر" },
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

  return (
    <div className="flex min-h-full flex-col" dir={dir}>
      <DashboardChrome
        roleLabelEn={labels[role].en}
        roleLabelAr={labels[role].ar}
        userName={session.name}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

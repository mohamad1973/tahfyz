import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreateTeacherForm } from "@/components/create-teacher-form";
import { requireSession } from "@/lib/auth";
import { getAllUsers, getTeachers } from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "إدارة الشيوخ" };
export const dynamic = "force-dynamic";

export default async function AdminTeachersPage() {
  await requireSession(["admin"]);
  const [teachers, users] = await Promise.all([
    getTeachers({ includeInactive: true }),
    getAllUsers(),
  ]);
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <DashboardShell role="admin" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-olive-deep">إدارة الشيوخ</h1>
          <p className="mt-1 text-sm text-ink-muted">
            إضافة شيوخ، ضبط اليوزرنيم/الباسورد، والتحكم الكامل في ملفاتهم.
          </p>
        </div>
        <Link href="/admin" className="text-sm underline">
          العودة للوحة الحجوزات
        </Link>
      </div>

      <CreateTeacherForm />

      <section className="mt-10">
        <h2 className="font-display text-xl">كل الشيوخ</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[640px] text-right">
            <thead className="bg-bg-deep/60 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">الاسم</th>
                <th className="px-3 py-3 font-semibold">Username</th>
                <th className="px-3 py-3 font-semibold">الحالة</th>
                <th className="px-3 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => {
                const account = t.userId ? userById[t.userId] : undefined;
                return (
                  <tr key={t.id} className="border-t border-line text-sm">
                    <td className="px-3 py-3">
                      <div className="font-medium">{t.nameAr || t.name}</div>
                      <div className="text-xs text-ink-muted">{t.name}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {account?.username || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {t.active ? (
                        <span className="text-ok">نشط</span>
                      ) : (
                        <span className="text-danger">متوقف</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/teachers/${t.id}`}
                        className="rounded-lg bg-olive px-3 py-1.5 text-xs font-semibold text-card"
                      >
                        تعديل كامل
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}

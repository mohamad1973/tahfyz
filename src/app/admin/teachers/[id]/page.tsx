import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccountCredentialsForm } from "@/components/account-credentials-form";
import { AvailabilityEditor } from "@/components/availability-editor";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { TeacherProfileEditor } from "@/components/teacher-profile-editor";
import { requireSession } from "@/lib/auth";
import {
  getAvailability,
  getTeacher,
  getUserById,
} from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "تعديل شيخ" };
export const dynamic = "force-dynamic";

export default async function AdminTeacherEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession(["admin"]);
  const { id } = await params;
  const teacher = await getTeacher(id);
  if (!teacher) notFound();

  const availability = await getAvailability(id);
  const account = teacher.userId
    ? await getUserById(teacher.userId)
    : undefined;

  return (
    <DashboardShell role="admin" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-olive-deep">
            {teacher.nameAr || teacher.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            تحكم كامل مثل داشبورد الشيخ: حساب، جدول، صورة، وسائط، نبذة.
          </p>
        </div>
        <Link href="/admin/teachers" className="text-sm underline">
          كل الشيوخ
        </Link>
      </div>

      {account ? (
        <section className="mt-8">
          <AccountCredentialsForm
            userId={account.id}
            username={account.username}
            email={account.email}
            mode="admin"
          />
          <p className="mt-2 text-xs text-ink-muted">
            تقدر تدخل بحسابه من /login باليوزرنيم والباسورد اللي حاطه هنا.
          </p>
        </section>
      ) : (
        <p className="mt-8 text-sm text-danger">لا يوجد حساب مستخدم مرتبط.</p>
      )}

      <section className="mt-10">
        <AvailabilityEditor teacherId={id} initial={availability} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-xl">كاليندر الحجوزات</h2>
        <div className="rounded-2xl border border-line bg-card p-4" dir="ltr">
          <ScheduleCalendar teacherId={id} selectable={false} />
        </div>
      </section>

      <section className="mt-10">
        <TeacherProfileEditor teacher={teacher} mode="admin" />
      </section>
    </DashboardShell>
  );
}

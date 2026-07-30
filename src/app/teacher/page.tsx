import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccountCredentialsForm } from "@/components/account-credentials-form";
import { AvailabilityEditor } from "@/components/availability-editor";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { TeacherProfileEditor } from "@/components/teacher-profile-editor";
import {
  expireStaleHolds,
  getAvailability,
  getNotifications,
  getTeacher,
  getUserById,
  markNotificationRead,
} from "@/lib/store";
import { requireSession } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Teacher" };
export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const { user } = await requireSession(["teacher"]);
  await expireStaleHolds();
  const teacherId = user.teacherId!;
  const teacher = await getTeacher(teacherId);
  const availability = await getAvailability(teacherId);
  const account = await getUserById(user.id);
  const notifications = await getNotifications(user.id);

  for (const n of notifications.filter((x) => !x.read).slice(0, 20)) {
    await markNotificationRead(n.id);
  }

  if (!teacher || !account) {
    return (
      <DashboardShell role="teacher" dir="rtl">
        <p>لم يتم العثور على ملف المعلم.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="teacher" dir="rtl">
      <h1 className="font-display text-3xl text-olive-deep">
        مرحباً، {teacher.nameAr || user.name}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        عدّل حسابك، بروفايلك، الوسائط، والجدول الأسبوعي.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-xl">الإشعارات</h2>
        <ul className="mt-3 space-y-2">
          {notifications.length === 0 && (
            <li className="text-sm text-ink-muted">لا إشعارات بعد.</li>
          )}
          {notifications.slice(0, 8).map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-line bg-card px-4 py-3 text-sm"
            >
              <div className="font-semibold">{n.title}</div>
              <p className="mt-1 text-ink-muted">{n.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <AccountCredentialsForm
          userId={account.id}
          username={account.username}
          mode="self"
        />
      </section>

      <section className="mt-10">
        <AvailabilityEditor teacherId={teacherId} initial={availability} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-xl">جدولي (كاليندر الحجوزات)</h2>
        <div className="rounded-2xl border border-line bg-card p-4" dir="ltr">
          <ScheduleCalendar teacherId={teacherId} selectable={false} />
        </div>
      </section>

      <section className="mt-10" dir="rtl">
        <TeacherProfileEditor teacher={teacher} mode="self" />
      </section>

      <p className="mt-8 text-sm text-ink-muted">
        <Link href="/" className="underline">
          العودة للموقع
        </Link>
      </p>
    </DashboardShell>
  );
}

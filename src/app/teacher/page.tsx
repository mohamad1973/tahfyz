import { DashboardShell } from "@/components/dashboard-shell";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { TeacherProfileEditor } from "@/components/teacher-profile-editor";
import {
  expireStaleHolds,
  getNotifications,
  getTeacher,
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
  const notifications = await getNotifications(user.id);

  for (const n of notifications.filter((x) => !x.read).slice(0, 20)) {
    await markNotificationRead(n.id);
  }

  if (!teacher) {
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
        عدّل بروفايلك، ارفع وسائط، وتابع الجدول: المربعات المؤكدة مظللة بالكامل
        والمعلّقة بانتظار الدفع بلون رملي.
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
        <h2 className="mb-3 font-display text-xl">جدولي (كاليندر)</h2>
        <div className="rounded-2xl border border-line bg-card p-4" dir="ltr">
          <ScheduleCalendar teacherId={teacherId} selectable={false} />
        </div>
      </section>

      <section className="mt-10" dir="rtl">
        <TeacherProfileEditor teacher={teacher} />
      </section>
    </DashboardShell>
  );
}

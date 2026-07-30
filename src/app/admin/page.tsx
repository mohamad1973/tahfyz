import { DashboardShell } from "@/components/dashboard-shell";
import { BookingAdminRow } from "@/components/booking-admin-row";
import {
  expireStaleHolds,
  getAllUsers,
  getBookings,
  getTeachers,
} from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Academy Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await expireStaleHolds();
  const [bookings, teachers, users] = await Promise.all([
    getBookings(),
    getTeachers(),
    getAllUsers(),
  ]);

  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t.name]));
  const pending = bookings.filter((b) => b.status === "pending_payment");
  const students = users.filter((u) => u.role === "student");

  return (
    <DashboardShell role="admin" dir="rtl">
      <h1 className="font-display text-3xl text-olive-deep">لوحة الأكاديمية</h1>
      <p className="mt-1 text-sm text-ink-muted">
        حجوزات الضيوف تظهر هنا فقط حتى يتم التحصيل وإنشاء حساب الطالب.
      </p>
      <p className="mt-3">
        <a
          href="/admin/teachers"
          className="inline-flex rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card"
        >
          إدارة الشيوخ (حسابات · بروفايل · جدول)
        </a>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="بانتظار الدفع" value={pending.length} />
        <Stat label="إجمالي الحجوزات" value={bookings.length} />
        <Stat label="الطلاب" value={students.length} />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">الحجوزات</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-right">
            <thead className="bg-bg-deep/60 text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">الطالب</th>
                <th className="px-3 py-3 font-semibold">تواصل</th>
                <th className="px-3 py-3 font-semibold">الموعد</th>
                <th className="px-3 py-3 font-semibold">الحالة</th>
                <th className="px-3 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-ink-muted"
                  >
                    لا توجد حجوزات بعد.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <BookingAdminRow
                    key={b.id}
                    booking={b}
                    teacherName={teacherMap[b.teacherId] || b.teacherId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">حسابات الطلاب</h2>
        <ul className="mt-3 space-y-2">
          {students.length === 0 && (
            <li className="text-sm text-ink-muted">
              تُنشأ تلقائياً بعد تأكيد التحصيل.
            </li>
          )}
          {students.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-line bg-card px-4 py-3 text-sm"
            >
              <span className="font-medium">{s.name}</span>
              <span className="mx-2 text-ink-muted">·</span>
              <span className="text-ink-muted">{s.username}{s.email ? ` · ${s.email}` : ""}</span>
              {s.mustSetPassword && (
                <span className="mr-2 rounded-full bg-sand-soft px-2 py-0.5 text-xs">
                  بانتظار تعيين كلمة المرور
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-3xl text-olive-deep">{value}</div>
    </div>
  );
}

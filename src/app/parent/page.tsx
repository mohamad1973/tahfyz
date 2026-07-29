import { DashboardShell } from "@/components/dashboard-shell";
import { LinkChildForm } from "@/components/link-child-form";
import { requireSession } from "@/lib/auth";
import { getBookings, getChildrenForParent, getTeachers } from "@/lib/store";
import { formatSlotRange } from "@/lib/slots";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Parent" };
export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const { user } = await requireSession(["parent"]);
  const children = await getChildrenForParent(user.id);
  const teachers = await getTeachers();
  const map = Object.fromEntries(teachers.map((t) => [t.id, t.name]));

  const childBookings = await Promise.all(
    children.map(async (c) => ({
      child: c,
      bookings: await getBookings({ studentId: c.id }),
    })),
  );

  return (
    <DashboardShell role="parent">
      <h1 className="font-display text-3xl text-olive-deep">
        Parent dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Link your child&apos;s student account (created after payment) to follow
        their lessons.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-xl">Link a student</h2>
        <LinkChildForm />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Children</h2>
        {children.length === 0 && (
          <p className="mt-2 text-sm text-ink-muted">No linked students yet.</p>
        )}
        {childBookings.map(({ child, bookings }) => (
          <div key={child.id} className="mt-4 rounded-2xl border border-line p-4">
            <h3 className="font-semibold">
              {child.name}{" "}
              <span className="font-normal text-ink-muted">({child.email})</span>
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              {bookings.length === 0 && (
                <li className="text-ink-muted">No bookings.</li>
              )}
              {bookings.map((b) => (
                <li key={b.id}>
                  {map[b.teacherId]} ·{" "}
                  {formatSlotRange(b.slotStart, b.slotEnd, b.timezone)} ·{" "}
                  <span className="font-semibold text-ok">{b.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </DashboardShell>
  );
}

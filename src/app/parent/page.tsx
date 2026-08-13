import { DashboardShell } from "@/components/dashboard-shell";
import { ParentDashboardClient } from "@/components/parent-dashboard-client";
import { requireSession } from "@/lib/auth";
import { getBookings, getChildrenForParent, getTeachers } from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Parent" };
export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const { user } = await requireSession(["parent"]);
  const children = await getChildrenForParent(user.id);
  const teachers = await getTeachers();
  const teacherNames = Object.fromEntries(teachers.map((t) => [t.id, t.name]));

  const childBookings = await Promise.all(
    children.map(async (c) => ({
      child: c,
      bookings: await getBookings({ studentId: c.id }),
    })),
  );

  return (
    <DashboardShell role="parent">
      <ParentDashboardClient
        childBookings={childBookings}
        teacherNames={teacherNames}
      />
    </DashboardShell>
  );
}

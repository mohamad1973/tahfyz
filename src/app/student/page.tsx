import { DashboardShell } from "@/components/dashboard-shell";
import { StudentDashboardClient } from "@/components/student-dashboard-client";
import { requireSession } from "@/lib/auth";
import {
  getBookings,
  getTeachers,
  linkGuestBookingsToStudent,
  listStudentTeacherPairs,
} from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const { user } = await requireSession(["student"]);
  await linkGuestBookingsToStudent(user);
  const bookings = await getBookings({ studentId: user.id });
  const teachers = await getTeachers({ includeInactive: true });
  const chatPartners = await listStudentTeacherPairs(user.id);
  const academyWa = process.env.NEXT_PUBLIC_ACADEMY_WHATSAPP || "201000000001";

  return (
    <DashboardShell role="student">
      <StudentDashboardClient
        userName={user.name}
        bookings={bookings}
        teachers={teachers}
        chatPartners={chatPartners}
        academyWa={academyWa}
      />
    </DashboardShell>
  );
}

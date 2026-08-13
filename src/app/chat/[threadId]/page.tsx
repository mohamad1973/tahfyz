import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { LessonChatClient } from "@/components/lesson-chat-client";
import { requireSession } from "@/lib/auth";
import {
  getChatThread,
  getTeacher,
  getUserById,
} from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lesson Chat" };
export const dynamic = "force-dynamic";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { user } = await requireSession(["student", "teacher"]);
  const { threadId } = await params;
  const thread = await getChatThread(threadId);
  if (!thread) notFound();

  const allowed =
    (user.role === "student" && thread.studentId === user.id) ||
    (user.role === "teacher" && thread.teacherId === user.teacherId);
  if (!allowed) redirect(user.role === "teacher" ? "/teacher" : "/student");

  const teacher = await getTeacher(thread.teacherId);
  const student = await getUserById(thread.studentId);
  const peerName =
    user.role === "student"
      ? teacher?.nameAr || teacher?.name || "Teacher"
      : student?.name || "Student";

  return (
    <DashboardShell role={user.role} dir="rtl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-olive-deep">شات الدرس</h1>
        <Link
          href={user.role === "teacher" ? "/teacher" : "/student"}
          className="text-sm underline"
        >
          رجوع
        </Link>
      </div>
      <LessonChatClient
        threadId={thread.id}
        currentUserId={user.id}
        role={user.role === "teacher" ? "teacher" : "student"}
        peerName={peerName}
      />
    </DashboardShell>
  );
}

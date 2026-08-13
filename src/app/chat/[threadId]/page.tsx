import { DashboardShell } from "@/components/dashboard-shell";
import { ChatThreadHeader } from "@/components/chat-thread-header";
import { requireSession } from "@/lib/auth";
import {
  getChatThread,
  getTeacher,
  getUserById,
} from "@/lib/store";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
    <DashboardShell role={user.role}>
      <ChatThreadHeader
        backHref={user.role === "teacher" ? "/teacher" : "/student"}
        peerName={peerName}
        threadId={thread.id}
        currentUserId={user.id}
        role={user.role === "teacher" ? "teacher" : "student"}
      />
    </DashboardShell>
  );
}

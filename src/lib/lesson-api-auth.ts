import { getSession } from "./auth";
import { getChatThread, getUserById } from "./store";

export async function authorizeLessonThread(threadId: string) {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Unauthorized", status: 401 };
  }
  const user = await getUserById(session.userId);
  if (!user || (user.role !== "student" && user.role !== "teacher")) {
    return { ok: false as const, error: "Unauthorized", status: 401 };
  }
  const thread = await getChatThread(threadId);
  if (!thread) {
    return { ok: false as const, error: "Chat not found", status: 404 };
  }
  const allowed =
    (user.role === "student" && thread.studentId === user.id) ||
    (user.role === "teacher" && thread.teacherId === user.teacherId);
  if (!allowed) {
    return { ok: false as const, error: "Not authorized", status: 403 };
  }
  return { ok: true as const, user, thread };
}

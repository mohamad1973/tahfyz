import { NextResponse } from "next/server";
import { authorizeLessonThread } from "@/lib/lesson-api-auth";
import { getChatMessages } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const threadId = new URL(req.url).searchParams.get("threadId")?.trim() || "";
  if (!threadId) {
    return NextResponse.json(
      { ok: false, error: "Missing thread" },
      { status: 400 },
    );
  }
  const access = await authorizeLessonThread(threadId);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status },
    );
  }
  const messages = await getChatMessages(threadId);
  return NextResponse.json({ ok: true, messages });
}

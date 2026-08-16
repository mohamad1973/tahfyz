import type { ChatMessage, LessonCallState } from "./types";

export async function fetchChatMessagesApi(
  threadId: string,
): Promise<{ ok: true; messages: ChatMessage[] } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `/api/chat/messages?threadId=${encodeURIComponent(threadId)}`,
      { cache: "no-store" },
    );
    const data = (await res.json()) as {
      ok?: boolean;
      messages?: ChatMessage[];
      error?: string;
    };
    if (!res.ok || !data.ok || !Array.isArray(data.messages)) {
      return { ok: false, error: data.error || "Chat sync failed" };
    }
    return { ok: true, messages: data.messages };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Chat sync failed",
    };
  }
}

export async function fetchLessonCallApi(
  threadId: string,
): Promise<
  { ok: true; call: LessonCallState | null } | { ok: false; error: string }
> {
  try {
    const res = await fetch(
      `/api/lesson-call?threadId=${encodeURIComponent(threadId)}`,
      { cache: "no-store" },
    );
    const data = (await res.json()) as {
      ok?: boolean;
      call?: LessonCallState | null;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Call sync failed" };
    }
    return { ok: true, call: data.call ?? null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Call sync failed",
    };
  }
}

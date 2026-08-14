import type { ChatMessage } from "@/lib/types";

export type LocalLessonLine = {
  id: string;
  originalText: string;
  translatedText: string;
  originalLang: "en" | "ar";
  translatedLang: "en" | "ar";
  createdAt: string;
  audioUrl?: string;
};

const STORAGE_PREFIX = "tahfyz-lesson:";

export function lessonDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function storageKey(threadId: string, date = lessonDateString()): string {
  return `${STORAGE_PREFIX}${threadId}:${date}`;
}

function readLines(threadId: string, date = lessonDateString()): LocalLessonLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(threadId, date));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalLessonLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLines(
  threadId: string,
  lines: LocalLessonLine[],
  date = lessonDateString(),
): void {
  window.localStorage.setItem(storageKey(threadId, date), JSON.stringify(lines));
}

function toLine(message: ChatMessage): LocalLessonLine {
  return {
    id: message.id,
    originalText: message.originalText,
    translatedText: message.translatedText,
    originalLang: message.originalLang,
    translatedLang: message.translatedLang,
    createdAt: message.createdAt,
    audioUrl: message.audioUrl,
  };
}

/** Save one message; skips if already saved. Returns whether newly added. */
export function saveLessonMessage(
  threadId: string,
  message: ChatMessage,
): boolean {
  const date = lessonDateString();
  const lines = readLines(threadId, date);
  if (lines.some((l) => l.id === message.id)) return false;
  lines.push(toLine(message));
  lines.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  writeLines(threadId, lines, date);
  return true;
}

/** Save all messages; skips duplicates. Returns count newly added. */
export function saveAllLessonMessages(
  threadId: string,
  messages: ChatMessage[],
): number {
  const date = lessonDateString();
  const lines = readLines(threadId, date);
  const have = new Set(lines.map((l) => l.id));
  let added = 0;
  for (const m of messages) {
    if (have.has(m.id)) continue;
    lines.push(toLine(m));
    have.add(m.id);
    added += 1;
  }
  lines.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  writeLines(threadId, lines, date);
  return added;
}

export function listSavedLessonMessages(
  threadId: string,
  date = lessonDateString(),
): LocalLessonLine[] {
  return readLines(threadId, date);
}

export function savedLessonIds(
  threadId: string,
  date = lessonDateString(),
): Set<string> {
  return new Set(readLines(threadId, date).map((l) => l.id));
}

function formatLessonText(lines: LocalLessonLine[], date: string): string {
  const header = [
    `Tahfyz lesson — ${date}`,
    `Lines: ${lines.length}`,
    "",
  ].join("\n");
  const body = lines
    .map((l, i) => {
      const when = new Date(l.createdAt).toLocaleString();
      const from = l.originalLang === "ar" ? "AR" : "EN";
      const to = l.translatedLang === "ar" ? "AR" : "EN";
      return [
        `--- ${i + 1} · ${when} · ${from}→${to} ---`,
        l.originalText.trim() || "(empty)",
        "",
        l.translatedText.trim() || "(empty)",
        l.audioUrl ? `Audio: ${l.audioUrl}` : "",
        "",
      ]
        .filter((x, idx, arr) => !(x === "" && arr[idx - 1] === ""))
        .join("\n");
    })
    .join("\n");
  return `${header}${body}`.trim() + "\n";
}

/** Download local notebook as tahfyz-lesson-YYYY-MM-DD.txt */
export function downloadLessonFile(
  threadId: string,
  date = lessonDateString(),
): { ok: true; count: number; filename: string } | { ok: false; error: string } {
  const lines = readLines(threadId, date);
  if (!lines.length) {
    return { ok: false, error: "empty" };
  }
  const filename = `tahfyz-lesson-${date}.txt`;
  const text = formatLessonText(lines, date);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true, count: lines.length, filename };
}

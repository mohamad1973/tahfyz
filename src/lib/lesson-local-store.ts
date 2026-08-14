import JSZip from "jszip";
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

/** First 10 English letters from the English side of the line. */
export function englishSlug10(line: LocalLessonLine, index: number): string {
  const english =
    line.originalLang === "en" ? line.originalText : line.translatedText;
  const letters = (english || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 10);
  if (letters.length >= 3) return letters;
  if (letters.length > 0) return `${letters}${index + 1}`;
  return `line${index + 1}`;
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

function extFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-z0-9]+)$/i);
    if (m) return m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return "webm";
}

function lineTxtContent(line: LocalLessonLine): string {
  const when = new Date(line.createdAt).toLocaleString();
  const from = line.originalLang === "ar" ? "AR" : "EN";
  const to = line.translatedLang === "ar" ? "AR" : "EN";
  return [
    `Tahfyz · ${when} · ${from}->${to}`,
    "",
    line.originalText.trim() || "(empty)",
    "",
    line.translatedText.trim() || "(empty)",
    "",
  ].join("\n");
}

function utf8BomBlob(text: string): Blob {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const body = new TextEncoder().encode(text);
  const merged = new Uint8Array(bom.length + body.length);
  merged.set(bom, 0);
  merged.set(body, bom.length);
  return new Blob([merged], { type: "text/plain;charset=utf-8" });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Download lesson as ZIP: each line → {slug}.txt + optional {slug}.{ext} audio.
 * Slug = first 10 English letters from the English text.
 */
export async function downloadLessonFile(
  threadId: string,
  date = lessonDateString(),
): Promise<
  | { ok: true; count: number; filename: string }
  | { ok: false; error: string }
> {
  const lines = readLines(threadId, date);
  if (!lines.length) {
    return { ok: false, error: "empty" };
  }

  const zip = new JSZip();
  const used = new Set<string>();
  const folder = zip.folder(`tahfyz-lesson-${date}`);
  if (!folder) {
    return { ok: false, error: "zip" };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const slug = uniqueSlug(englishSlug10(line, i), used);
    folder.file(`${slug}.txt`, utf8BomBlob(lineTxtContent(line)));

    if (line.audioUrl) {
      try {
        const res = await fetch(line.audioUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const ext = extFromUrl(line.audioUrl);
          folder.file(`${slug}.${ext}`, buf);
        }
      } catch {
        /* skip failed audio fetch */
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const filename = `tahfyz-lesson-${date}.zip`;
  triggerDownload(zipBlob, filename);
  return { ok: true, count: lines.length, filename };
}

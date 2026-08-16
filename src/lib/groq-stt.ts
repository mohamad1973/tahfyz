import type { ChatLang } from "./translate";

const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

function filenameFromContentType(contentType: string, fallback = "audio.webm"): string {
  if (contentType.includes("mp4") || contentType.includes("m4a")) return "audio.mp4";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "audio.mp3";
  if (contentType.includes("ogg")) return "audio.ogg";
  if (contentType.includes("wav")) return "audio.wav";
  return fallback;
}

function filenameFromUrl(audioUrl: string, contentType: string): string {
  try {
    const path = new URL(audioUrl).pathname;
    const base = path.split("/").pop() || "audio.webm";
    if (base.includes(".")) return base;
  } catch {
    /* ignore */
  }
  return filenameFromContentType(contentType);
}

export async function transcribeAudioBytes(
  bytes: ArrayBuffer,
  language: ChatLang,
  contentType = "audio/webm",
  filename?: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "GROQ_API_KEY is not configured",
    };
  }

  if (!bytes.byteLength) {
    return { ok: false, error: "Empty audio file" };
  }

  const type = contentType.split(";")[0].trim() || "audio/webm";
  const form = new FormData();
  const file = new File(
    [bytes],
    filename || filenameFromContentType(type),
    { type },
  );
  form.append("file", file);
  form.append(
    "model",
    language === "ar" ? "whisper-large-v3" : "whisper-large-v3-turbo",
  );
  form.append("language", language);
  form.append("response_format", "json");
  form.append("temperature", "0");

  let res: Response;
  try {
    res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Transcription request failed",
    };
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as {
        error?: { message?: string };
      };
      if (errBody.error?.message) detail = errBody.error.message;
    } catch {
      /* ignore */
    }
    return { ok: false, error: detail };
  }

  const data = (await res.json()) as { text?: string };
  const text = data.text?.trim() ?? "";
  if (!text) {
    return { ok: false, error: "Empty transcription" };
  }
  return { ok: true, text };
}

export async function transcribeAudioUrl(
  audioUrl: string,
  language: ChatLang,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "GROQ_API_KEY is not configured",
    };
  }

  let audioRes: Response;
  try {
    audioRes = await fetch(audioUrl, {
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to fetch audio",
    };
  }
  if (!audioRes.ok) {
    return { ok: false, error: `Failed to fetch audio (${audioRes.status})` };
  }

  const contentType =
    audioRes.headers.get("content-type")?.split(";")[0].trim() ||
    "audio/webm";
  const bytes = await audioRes.arrayBuffer();
  return transcribeAudioBytes(
    bytes,
    language,
    contentType,
    filenameFromUrl(audioUrl, contentType),
  );
}

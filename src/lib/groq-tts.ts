import { put } from "@vercel/blob";
import type { ChatLang } from "./translate";

const GROQ_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech";
const MAX_CHARS = 4000;

const TTS = {
  en: { model: "playai-tts", voice: "Fritz-PlayAI" },
  ar: { model: "playai-tts-arabic", voice: "Amira-PlayAI" },
} as const;

export async function synthesizeSpeech(
  text: string,
  language: ChatLang,
): Promise<{ ok: true; bytes: ArrayBuffer } | { ok: false; error: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GROQ_API_KEY is not configured" };
  }

  const input = text.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  if (!input) {
    return { ok: false, error: "Empty text" };
  }

  const { model, voice } = TTS[language] ?? TTS.en;
  let res: Response;
  try {
    res = await fetch(GROQ_SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Speech request failed",
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

  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) {
    return { ok: false, error: "Empty speech file" };
  }
  return { ok: true, bytes };
}

export async function uploadTranslatedSpeech(
  threadId: string,
  messageId: string,
  bytes: ArrayBuffer,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const blob = await put(
      `chat/${threadId}/tts-${messageId}.mp3`,
      Buffer.from(bytes),
      {
        access: "public",
        contentType: "audio/mpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );
    return { ok: true, url: blob.url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to upload speech",
    };
  }
}

export async function generateTranslatedSpeechUrl(input: {
  threadId: string;
  messageId: string;
  text: string;
  language: ChatLang;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const speech = await synthesizeSpeech(input.text, input.language);
  if (!speech.ok) return speech;
  return uploadTranslatedSpeech(input.threadId, input.messageId, speech.bytes);
}

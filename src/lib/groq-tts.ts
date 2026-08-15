import { put } from "@vercel/blob";
import type { ChatLang } from "./translate";

export const GROQ_TERMS_ERROR = "GROQ_TERMS";

const GROQ_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech";
/** Orpheus input limit per request */
const CHUNK_CHARS = 200;
const MAX_TOTAL_CHARS = 4000;

const TTS = {
  en: { model: "canopylabs/orpheus-v1-english", voice: "austin" },
  ar: { model: "canopylabs/orpheus-arabic-saudi", voice: "noura" },
} as const;

/** Split text into chunks of at most maxLen, preferring sentence then word breaks. */
export function chunkTextForTts(text: string, maxLen = CHUNK_CHARS): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const chunks: string[] = [];
  let rest = cleaned;
  while (rest.length > maxLen) {
    let cut = -1;
    const window = rest.slice(0, maxLen + 1);
    const sentenceBreak = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf("。"),
      window.lastIndexOf("؟"),
      window.lastIndexOf("!\n"),
      window.lastIndexOf("؟ "),
    );
    if (sentenceBreak >= Math.floor(maxLen * 0.4)) {
      cut = sentenceBreak + 1;
    } else {
      const space = window.lastIndexOf(" ");
      if (space >= Math.floor(maxLen * 0.4)) cut = space;
      else cut = maxLen;
    }
    const piece = rest.slice(0, cut).trim();
    if (piece) chunks.push(piece);
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function findDataChunkOffset(bytes: Uint8Array): number {
  // Standard PCM WAV: "data" chunk after "fmt "
  let i = 12;
  while (i + 8 <= bytes.length) {
    const id = String.fromCharCode(
      bytes[i],
      bytes[i + 1],
      bytes[i + 2],
      bytes[i + 3],
    );
    const size =
      bytes[i + 4] |
      (bytes[i + 5] << 8) |
      (bytes[i + 6] << 16) |
      (bytes[i + 7] << 24);
    if (id === "data") return i;
    i += 8 + size;
  }
  // Fallback: assume 44-byte header
  return 36;
}

/** Concatenate WAV files that share the same format (Orpheus output). */
export function concatWavBuffers(parts: ArrayBuffer[]): ArrayBuffer {
  if (parts.length === 0) return new ArrayBuffer(0);
  if (parts.length === 1) return parts[0];

  const views = parts.map((p) => new Uint8Array(p));
  const first = views[0];
  const dataOffset = findDataChunkOffset(first);
  const header = first.slice(0, dataOffset + 8);
  const pcmParts: Uint8Array[] = [first.slice(dataOffset + 8)];

  for (let i = 1; i < views.length; i++) {
    const off = findDataChunkOffset(views[i]);
    pcmParts.push(views[i].slice(off + 8));
  }

  let pcmLen = 0;
  for (const p of pcmParts) pcmLen += p.length;

  const out = new Uint8Array(dataOffset + 8 + pcmLen);
  out.set(header, 0);
  // data chunk size (4 bytes little-endian at dataOffset+4)
  out[dataOffset + 4] = pcmLen & 0xff;
  out[dataOffset + 5] = (pcmLen >> 8) & 0xff;
  out[dataOffset + 6] = (pcmLen >> 16) & 0xff;
  out[dataOffset + 7] = (pcmLen >> 24) & 0xff;
  // RIFF chunk size = file size - 8
  const riffSize = out.length - 8;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >> 8) & 0xff;
  out[6] = (riffSize >> 16) & 0xff;
  out[7] = (riffSize >> 24) & 0xff;

  let cursor = dataOffset + 8;
  for (const p of pcmParts) {
    out.set(p, cursor);
    cursor += p.length;
  }
  return out.buffer;
}

async function synthesizeChunk(
  apiKey: string,
  text: string,
  language: ChatLang,
): Promise<{ ok: true; bytes: ArrayBuffer } | { ok: false; error: string }> {
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
        input: text,
        response_format: "wav",
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
    if (/terms acceptance/i.test(detail)) {
      return { ok: false, error: GROQ_TERMS_ERROR };
    }
    return { ok: false, error: detail };
  }

  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) {
    return { ok: false, error: "Empty speech file" };
  }
  return { ok: true, bytes };
}

export async function synthesizeSpeech(
  text: string,
  language: ChatLang,
): Promise<{ ok: true; bytes: ArrayBuffer } | { ok: false; error: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "GROQ_API_KEY is not configured" };
  }

  const input = text.replace(/\s+/g, " ").trim().slice(0, MAX_TOTAL_CHARS);
  if (!input) {
    return { ok: false, error: "Empty text" };
  }

  const chunks = chunkTextForTts(input, CHUNK_CHARS);
  if (!chunks.length) {
    return { ok: false, error: "Empty text" };
  }

  const wavs: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const part = await synthesizeChunk(apiKey, chunk, language);
    if (!part.ok) return part;
    wavs.push(part.bytes);
  }

  return { ok: true, bytes: concatWavBuffers(wavs) };
}

export async function uploadTranslatedSpeech(
  threadId: string,
  messageId: string,
  bytes: ArrayBuffer,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const blob = await put(
      `chat/${threadId}/tts-${messageId}.wav`,
      Buffer.from(bytes),
      {
        access: "public",
        contentType: "audio/wav",
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

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

function isAllowedBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host === "public.blob.vercel-storage.com" ||
      host.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Speech transcription is not configured (OPENAI_API_KEY)" },
      { status: 503 },
    );
  }

  let body: { audioUrl?: string; language?: string };
  try {
    body = (await request.json()) as { audioUrl?: string; language?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const audioUrl = body.audioUrl?.trim();
  if (!audioUrl || !isAllowedBlobUrl(audioUrl)) {
    return NextResponse.json({ error: "Invalid audio URL" }, { status: 400 });
  }

  const language =
    body.language === "ar" || body.language === "en" ? body.language : undefined;

  try {
    const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: "Failed to download audio" },
        { status: 400 },
      );
    }
    const contentType =
      audioRes.headers.get("content-type")?.split(";")[0].trim() ||
      "audio/webm";
    const ext = contentType.includes("mp4")
      ? "mp4"
      : contentType.includes("mpeg")
        ? "mp3"
        : contentType.includes("ogg")
          ? "ogg"
          : contentType.includes("wav")
            ? "wav"
            : "webm";
    const bytes = await audioRes.arrayBuffer();
    if (bytes.byteLength < 500) {
      return NextResponse.json({ error: "Audio too short" }, { status: 400 });
    }

    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes], { type: contentType }),
      `rec.${ext}`,
    );
    form.append("model", "whisper-1");
    if (language) form.append("language", language);

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!whisperRes.ok) {
      const detail = await whisperRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Transcription failed",
          detail: detail.slice(0, 200),
        },
        { status: 502 },
      );
    }

    const data = (await whisperRes.json()) as { text?: string };
    const text = data.text?.trim() || "";
    if (!text) {
      return NextResponse.json(
        { error: "No speech detected in audio" },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Transcription request failed",
      },
      { status: 500 },
    );
  }
}

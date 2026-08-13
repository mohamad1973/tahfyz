export type ChatLang = "en" | "ar";

/** Translate text between English and Arabic (MyMemory free endpoint). */
export async function translateText(
  text: string,
  from: ChatLang,
  to: ChatLang,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (from === to) return trimmed;

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", trimmed.slice(0, 450));
  url.searchParams.set("langpair", `${from}|${to}`);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return trimmed;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const out = data.responseData?.translatedText?.trim();
    if (!out || data.responseStatus !== 200) return trimmed;
    // MyMemory sometimes returns "QUERY LENGTH LIMIT..." warnings
    if (/QUERY LENGTH LIMIT/i.test(out)) return trimmed;
    return out;
  } catch {
    return trimmed;
  }
}

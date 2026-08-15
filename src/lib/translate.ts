import { protectTajweedTerms } from "./tajweed-glossary";

export type ChatLang = "en" | "ar";

function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/** Infer source language from script: Arabic letters → ar, otherwise en. */
export function detectChatLang(text: string): ChatLang {
  return hasArabicScript(text) ? "ar" : "en";
}

function leftoverAfterMasks(masked: string): string {
  return masked.replace(/__TJ\d+__/g, "").replace(/\s+/g, "").trim();
}

function looksLikeTransliteration(text: string): boolean {
  const t = text.toLowerCase();
  if (
    /\b(al+ss?alamu?|assalamu?|ealaykum|3alaykum|alaykum|warahmat)\b/i.test(t)
  ) {
    return true;
  }
  const words = t.split(/[^a-z]+/).filter((w) => w.length > 1);
  if (words.length < 2) return false;
  const englishHits = (
    t.match(
      /\b(the|a|an|is|are|you|and|of|to|peace|upon|mercy|blessings?|hello|hi)\b/gi,
    ) || []
  ).length;
  return englishHits === 0;
}

function translationLooksWrong(
  original: string,
  translated: string,
  from: ChatLang,
  to: ChatLang,
): boolean {
  if (!translated) return true;
  if (translated === original) return true;
  if (from === "ar" && to === "en") {
    if (hasArabicScript(translated)) return true;
    if (looksLikeTransliteration(translated)) return true;
  }
  if (from === "en" && to === "ar" && !hasArabicScript(translated)) return true;
  return false;
}

async function translateGtx(
  text: string,
  to: ChatLang,
): Promise<string | null> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", to);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text.slice(0, 900));
  const res = await fetch(url.toString(), {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const parts = data[0] as Array<[string] | undefined>;
  const out = parts
    .map((p) => (Array.isArray(p) ? p[0] : ""))
    .join("")
    .trim();
  return out || null;
}

/** Translate text between English and Arabic only. */
export async function translateText(
  text: string,
  _from?: ChatLang,
  to?: ChatLang,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const source = detectChatLang(trimmed);
  const target: ChatLang =
    to && to !== source ? to : source === "ar" ? "en" : "ar";
  if (source === target) return trimmed;

  const { masked, restore } = protectTajweedTerms(trimmed, source, target);
  if (!leftoverAfterMasks(masked)) {
    return restore(masked);
  }

  try {
    const out = await translateGtx(masked, target);
    if (out && !translationLooksWrong(masked, out, source, target)) {
      return restore(out);
    }
  } catch {
    /* keep original rather than a third language */
  }

  return restore(trimmed);
}

import { protectTajweedTerms } from "./tajweed-glossary";

export type ChatLang = "en" | "ar";

function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

async function translateMyMemory(
  text: string,
  from: ChatLang,
  to: ChatLang,
): Promise<string | null> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 450));
  url.searchParams.set("langpair", `${from}|${to}`);
  const res = await fetch(url.toString(), {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };
  const out = data.responseData?.translatedText?.trim();
  if (!out || data.responseStatus !== 200) return null;
  if (/QUERY LENGTH LIMIT/i.test(out)) return null;
  return out;
}

/** Google gtx translate (public endpoint) as fallback. */
async function translateGtx(
  text: string,
  from: ChatLang,
  to: ChatLang,
): Promise<string | null> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", from);
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

function translationLooksWrong(
  original: string,
  translated: string,
  from: ChatLang,
  to: ChatLang,
): boolean {
  if (!translated) return true;
  if (translated === original) return true;
  // ar→en should not still be mostly Arabic
  if (from === "ar" && to === "en" && hasArabicScript(translated)) return true;
  // en→ar should gain Arabic script
  if (from === "en" && to === "ar" && !hasArabicScript(translated)) return true;
  return false;
}

/** Translate text between English and Arabic with fallback. */
export async function translateText(
  text: string,
  from: ChatLang,
  to: ChatLang,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (from === to) return trimmed;

  const { masked, restore } = protectTajweedTerms(trimmed, from, to);

  try {
    const first = await translateMyMemory(masked, from, to);
    if (first && !translationLooksWrong(masked, first, from, to)) {
      return restore(first);
    }
  } catch {
    /* try fallback */
  }

  try {
    const second = await translateGtx(masked, from, to);
    if (second && !translationLooksWrong(masked, second, from, to)) {
      return restore(second);
    }
    if (second) return restore(second);
  } catch {
    /* fall through */
  }

  return restore(trimmed);
}

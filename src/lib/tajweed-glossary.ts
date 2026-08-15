type ChatLang = "en" | "ar";

/** Longer phrases first so they match before shorter pieces. */
const PAIRS: Array<{ ar: string; en: string }> = [
  {
    ar: "السلام عليكم ورحمة الله وبركاته",
    en: "Peace be upon you and the mercy of Allah and His blessings",
  },
  {
    ar: "السلام عليكم ورحمه الله وبركاته",
    en: "Peace be upon you and the mercy of Allah and His blessings",
  },
  {
    ar: "وعليكم السلام ورحمة الله وبركاته",
    en: "And peace be upon you and the mercy of Allah and His blessings",
  },
  {
    ar: "وعليكم السلام ورحمه الله وبركاته",
    en: "And peace be upon you and the mercy of Allah and His blessings",
  },
  {
    ar: "السلام عليكم ورحمة الله",
    en: "Peace be upon you and the mercy of Allah",
  },
  {
    ar: "السلام عليكم ورحمه الله",
    en: "Peace be upon you and the mercy of Allah",
  },
  { ar: "وعليكم السلام", en: "And peace be upon you" },
  { ar: "السلام عليكم", en: "Peace be upon you" },
  { ar: "إدغام بغنة", en: "Idgham with ghunnah" },
  { ar: "إدغام بلا غنة", en: "Idgham without ghunnah" },
  { ar: "نون ساكنة", en: "Noon sakinah" },
  { ar: "ميم ساكنة", en: "Meem sakinah" },
  { ar: "مد طبيعي", en: "natural madd" },
  { ar: "مد متصل", en: "connected madd" },
  { ar: "مد منفصل", en: "separated madd" },
  { ar: "أحكام النون", en: "Noon rules" },
  { ar: "مخارج الحروف", en: "makharij" },
  { ar: "التجويد", en: "Tajweed" },
  { ar: "تجويد", en: "Tajweed" },
  { ar: "إدغام", en: "Idgham" },
  { ar: "إخفاء", en: "Ikhfa" },
  { ar: "إقلاب", en: "Iqlab" },
  { ar: "إظهار", en: "Idhhar" },
  { ar: "غنة", en: "Ghunnah" },
  { ar: "قلقلة", en: "Qalqalah" },
  { ar: "تفخيم", en: "Tafkhim" },
  { ar: "ترقيق", en: "Tarqeeq" },
  { ar: "تنوين", en: "Tanween" },
  { ar: "تشديد", en: "Shaddah" },
  { ar: "سكون", en: "Sukoon" },
  { ar: "مخرج", en: "Makhraj" },
  { ar: "مخارج", en: "Makharij" },
  { ar: "التلاوة", en: "Tilawah" },
  { ar: "وقف", en: "Waqf" },
  { ar: "وصل", en: "Wasl" },
  { ar: "مد", en: "Madd" },
  { ar: "سورة", en: "Surah" },
  { ar: "آية", en: "Ayah" },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceTerm(pair: { ar: string; en: string }, from: ChatLang): string {
  return from === "ar" ? pair.ar : pair.en;
}

function targetTerm(pair: { ar: string; en: string }, to: ChatLang): string {
  return to === "ar" ? pair.ar : pair.en;
}

export function protectTajweedTerms(
  text: string,
  from: ChatLang,
  to: ChatLang,
): { masked: string; restore: (translated: string) => string } {
  const tokens: string[] = [];
  let masked = text;
  for (const pair of PAIRS) {
    const src = sourceTerm(pair, from);
    const dest = targetTerm(pair, to);
    const flags = from === "en" ? "gi" : "g";
    const re = new RegExp(escapeRegex(src), flags);
    masked = masked.replace(re, () => {
      const id = `__TJ${tokens.length}__`;
      tokens.push(dest);
      return id;
    });
  }
  return {
    masked,
    restore(translated: string) {
      let out = translated;
      tokens.forEach((term, i) => {
        out = out.replaceAll(`__TJ${i}__`, term);
      });
      return out;
    },
  };
}

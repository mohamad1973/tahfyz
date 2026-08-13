"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dictionaries, type Dictionary, type Lang } from "./dictionaries";

type I18nValue = {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
  dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nValue | null>(null);
const COOKIE = "tahfyz_lang";

function readCookieLang(): Lang {
  if (typeof document === "undefined") return "ar";
  const match = document.cookie.match(/(?:^|; )tahfyz_lang=(ar|en)/);
  return match?.[1] === "en" ? "en" : "ar";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    setLangState(readCookieLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.cookie = `${COOKIE}=${lang};path=/;max-age=31536000;samesite=lax`;
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      t: dictionaries[lang],
      setLang,
      dir: lang === "ar" ? "rtl" : "ltr",
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "ar" as Lang,
      t: dictionaries.ar,
      setLang: () => {},
      dir: "rtl" as const,
    };
  }
  return ctx;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <label className={className || "inline-flex items-center gap-1 text-xs"}>
      <span className="text-ink-muted">{t.language}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-md border border-line bg-bg px-2 py-1"
      >
        <option value="ar">العربية</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}

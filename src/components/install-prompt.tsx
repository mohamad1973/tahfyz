"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/i.test(ua);
  const webkit = /WebKit/i.test(ua);
  const chromeOrCriOS = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return iOS && webkit && !chromeOrCriOS;
}

export function InstallPrompt() {
  const { t, lang } = useI18n();
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    const secure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";
    if (secure && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore SW registration errors */
      });
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setIosHint(false);
      setCanPrompt(true);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      deferredRef.current = null;
      setCanPrompt(false);
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  async function onInstall() {
    const ev = deferredRef.current;
    if (!ev) return;
    await ev.prompt();
    const choice = await ev.userChoice;
    deferredRef.current = null;
    setCanPrompt(false);
    setVisible(false);
    void choice;
  }

  function onDismiss() {
    setVisible(false);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4"
      role="dialog"
      aria-label={t.installTitle}
    >
      <div className="mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-line bg-card p-3 shadow-[0_16px_48px_-20px_rgba(26,46,40,0.55)] sm:p-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-olive px-1 text-center text-[10px] font-bold leading-tight tracking-tight text-card sm:h-14 sm:w-14 sm:text-[11px]"
          aria-hidden
        >
          Tahfyz
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-olive-deep sm:text-lg">
            {t.installTitle}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
            {iosHint ? t.installIosHint : t.installBody}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!iosHint && canPrompt ? (
              <button
                type="button"
                onClick={() => void onInstall()}
                className="rounded-xl bg-olive px-3 py-2 text-sm font-semibold text-card hover:bg-olive-deep"
              >
                {t.installAction}
              </button>
            ) : null}
            {!iosHint && !canPrompt ? (
              <span className="text-xs text-ink-muted">{t.installWaiting}</span>
            ) : null}
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-bg"
            >
              {t.installLater}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-bg"
          aria-label={lang === "ar" ? "إغلاق" : "Close"}
        >
          ×
        </button>
      </div>
    </div>
  );
}

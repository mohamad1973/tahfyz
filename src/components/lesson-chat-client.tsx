"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ChatMessage } from "@/lib/types";
import type { ChatLang } from "@/lib/translate";
import {
  fetchChatMessagesAction,
  sendChatMessageAction,
} from "@/lib/actions";
import { useI18n } from "@/lib/i18n/provider";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((ev: {
        resultIndex: number;
        results: ArrayLike<{
          0: { transcript: string };
          isFinal: boolean;
          length: number;
        }>;
      }) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type PendingBubble = {
  id: string;
  originalLang: ChatLang;
  text: string;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function detectSpeechLang(text: string, fallback: ChatLang): ChatLang {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[A-Za-z]/.test(text)) return "en";
  return fallback;
}

function byNewest(a: ChatMessage, b: ChatMessage) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function LessonChatClient({
  threadId,
  role,
  peerName,
}: {
  threadId: string;
  currentUserId: string;
  role: "student" | "teacher";
  peerName: string;
}) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [pending, setPending] = useState<PendingBubble[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastStamp = useRef<string | undefined>(undefined);
  const aliveRef = useRef(true);
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const speakLangRef = useRef<ChatLang>(role === "teacher" ? "ar" : "en");

  const speakLang: ChatLang = role === "teacher" ? "ar" : "en";
  const speakLocale = role === "teacher" ? "ar-EG" : "en-US";
  speakLangRef.current = speakLang;

  const leftMessages = useMemo(
    () => messages.filter((m) => m.originalLang === "en").sort(byNewest),
    [messages],
  );
  const rightMessages = useMemo(
    () => messages.filter((m) => m.originalLang === "ar").sort(byNewest),
    [messages],
  );
  const leftPending = pending.filter((p) => p.originalLang === "en");
  const rightPending = pending.filter((p) => p.originalLang === "ar");

  function appendMessage(message: ChatMessage) {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message],
    );
    lastStamp.current = message.createdAt;
  }

  function sendFinal(text: string) {
    const payload = text.trim();
    if (!payload) return;
    const originalLang = detectSpeechLang(payload, speakLangRef.current);
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    setPending((prev) => [
      { id: tempId, originalLang, text: payload },
      ...prev,
    ]);
    setInterim("");

    sendQueueRef.current = sendQueueRef.current.then(async () => {
      setError(null);
      const res = await sendChatMessageAction({
        threadId,
        text: payload,
        originalLang,
      });
      setPending((prev) => prev.filter((p) => p.id !== tempId));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      appendMessage(res.message);
    });
  }

  useEffect(() => {
    start(async () => {
      const res = await fetchChatMessagesAction(threadId);
      if (res.ok) {
        setMessages(res.messages);
        lastStamp.current = res.messages.at(-1)?.createdAt;
      }
    });
  }, [threadId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const res = await fetchChatMessagesAction(threadId, lastStamp.current);
        if (!res.ok || res.messages.length === 0) return;
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const next = [...prev];
          for (const m of res.messages) {
            if (!ids.has(m.id)) next.push(m);
          }
          return next;
        });
        lastStamp.current = res.messages.at(-1)?.createdAt || lastStamp.current;
      })();
    }, 1000);
    return () => window.clearInterval(id);
  }, [threadId]);

  useEffect(() => {
    aliveRef.current = true;
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError(
        lang === "ar"
          ? "المتصفح لا يدعم التعرف على الصوت. استخدم Chrome."
          : "Speech recognition is not supported. Use Chrome.",
      );
      return;
    }

    let restartTimer: number | undefined;

    function begin() {
      if (!aliveRef.current || !Ctor) return;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      const rec = new Ctor();
      rec.lang = speakLocale;
      // Utterance mode: finals arrive faster, especially for Arabic
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (ev) => {
        let interimChunk = "";
        let finalChunk = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          const transcript = r[0].transcript;
          if (r.isFinal) finalChunk += transcript;
          else interimChunk += transcript;
        }
        if (finalChunk.trim()) sendFinal(finalChunk);
        else setInterim(interimChunk);
      };
      rec.onerror = (ev) => {
        if (ev.error === "aborted" || ev.error === "no-speech") return;
        setError(
          ev.error === "not-allowed"
            ? lang === "ar"
              ? "اسمح بالميكروفون من المتصفح"
              : "Allow microphone access in the browser"
            : ev.error,
        );
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
        if (!aliveRef.current) return;
        // Restart immediately for next sentence
        restartTimer = window.setTimeout(() => {
          if (aliveRef.current) begin();
        }, 80);
      };
      recognitionRef.current = rec;
      try {
        rec.start();
        setListening(true);
        setError(null);
      } catch {
        setListening(false);
        restartTimer = window.setTimeout(() => {
          if (aliveRef.current) begin();
        }, 400);
      }
    }

    begin();

    return () => {
      aliveRef.current = false;
      if (restartTimer) window.clearTimeout(restartTimer);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, speakLocale, lang]);

  const listeningLabel =
    lang === "ar"
      ? listening
        ? "يستمع…"
        : "في انتظار الميكروفون…"
      : listening
        ? "Listening…"
        : "Waiting for microphone…";

  function PaneMessages({
    items,
    pendingItems,
    showInterim,
    dir,
    cardClass,
  }: {
    items: ChatMessage[];
    pendingItems: PendingBubble[];
    showInterim: boolean;
    dir: "rtl" | "ltr";
    cardClass: string;
  }) {
    return (
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {showInterim && interim && (
          <div className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-ink-muted">
            … {interim}
          </div>
        )}
        {pendingItems.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-dashed border-olive/40 bg-olive/5 px-3 py-2 text-sm opacity-80"
          >
            <p className="whitespace-pre-wrap" dir={dir}>
              {p.text}
            </p>
          </div>
        ))}
        {items.map((m) => (
          <div key={m.id} className={cardClass}>
            <p className="whitespace-pre-wrap" dir={dir}>
              {m.translatedText}
            </p>
          </div>
        ))}
        {items.length === 0 &&
          pendingItems.length === 0 &&
          !(showInterim && interim) && (
            <p className="text-center text-xs text-ink-muted">
              {dir === "rtl" ? t.paneLeftEmpty : t.paneRightEmpty}
            </p>
          )}
      </div>
    );
  }

  return (
    <div className="flex h-[min(78vh,720px)] flex-col rounded-2xl border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <div className="font-display text-lg text-olive-deep">
          {t.chatWith} {peerName}
        </div>
        <p className="text-xs text-ink-muted">
          {role === "student" ? t.micHintStudent : t.micHintTeacher}
        </p>
        <p className="mt-1 text-[11px] text-ink-muted">{listeningLabel}</p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-line"
        dir="ltr"
      >
        <section className="flex min-h-0 flex-col" dir="rtl">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            English → العربية
          </header>
          <PaneMessages
            items={leftMessages}
            pendingItems={leftPending}
            showInterim={speakLang === "en"}
            dir="rtl"
            cardClass="rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
        </section>

        <section className="flex min-h-0 flex-col" dir="ltr">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            العربية → English
          </header>
          <PaneMessages
            items={rightMessages}
            pendingItems={rightPending}
            showInterim={speakLang === "ar"}
            dir="ltr"
            cardClass="rounded-xl border border-olive/25 bg-olive/5 px-3 py-2 text-sm"
          />
        </section>
      </div>
    </div>
  );
}

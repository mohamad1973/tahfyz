"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChatMessage } from "@/lib/types";
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

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
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
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const leftBottomRef = useRef<HTMLDivElement>(null);
  const rightBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastStamp = useRef<string | undefined>(undefined);
  const aliveRef = useRef(true);
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());

  const speakLang = role === "teacher" ? "ar" : "en";
  const speakLocale = role === "teacher" ? "ar-EG" : "en-US";

  const leftMessages = messages.filter((m) => m.originalLang === "en");
  const rightMessages = messages.filter((m) => m.originalLang === "ar");

  function appendMessage(message: ChatMessage) {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message],
    );
    lastStamp.current = message.createdAt;
  }

  function sendFinal(text: string) {
    const payload = text.trim();
    if (!payload) return;
    sendQueueRef.current = sendQueueRef.current.then(async () => {
      setError(null);
      const res = await sendChatMessageAction({
        threadId,
        text: payload,
        originalLang: speakLang,
      });
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
    }, 2000);
    return () => window.clearInterval(id);
  }, [threadId]);

  useEffect(() => {
    leftBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [leftMessages.length, interim, speakLang]);

  useEffect(() => {
    rightBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rightMessages.length, interim, speakLang]);

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
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev) => {
        let interimChunk = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          const transcript = r[0].transcript;
          if (r.isFinal) {
            sendFinal(transcript);
          } else {
            interimChunk += transcript;
          }
        }
        setInterim(interimChunk);
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
        setInterim("");
        if (!aliveRef.current) return;
        restartTimer = window.setTimeout(() => {
          if (aliveRef.current) begin();
        }, 250);
      };
      recognitionRef.current = rec;
      try {
        rec.start();
        setListening(true);
        setError(null);
      } catch {
        setListening(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart when role/thread changes
  }, [threadId, speakLocale, lang]);

  const listeningLabel =
    lang === "ar"
      ? listening
        ? "يستمع…"
        : "في انتظار الميكروفون…"
      : listening
        ? "Listening…"
        : "Waiting for microphone…";

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
        {/* Left: English heard → Arabic translation */}
        <section className="flex min-h-0 flex-col" dir="rtl">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            English → العربية
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {leftMessages.length === 0 && !(interim && speakLang === "en") && (
              <p className="text-center text-xs text-ink-muted">{t.paneLeftEmpty}</p>
            )}
            {leftMessages.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-line bg-bg px-3 py-2 text-sm"
              >
                <p className="whitespace-pre-wrap" dir="rtl">
                  {m.translatedText}
                </p>
              </div>
            ))}
            {interim && speakLang === "en" && (
              <div className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-ink-muted">
                … {interim}
              </div>
            )}
            <div ref={leftBottomRef} />
          </div>
        </section>

        {/* Right: Arabic heard → English translation */}
        <section className="flex min-h-0 flex-col" dir="ltr">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            العربية → English
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {rightMessages.length === 0 && !(interim && speakLang === "ar") && (
              <p className="text-center text-xs text-ink-muted">{t.paneRightEmpty}</p>
            )}
            {rightMessages.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-olive/25 bg-olive/5 px-3 py-2 text-sm"
              >
                <p className="whitespace-pre-wrap" dir="ltr">
                  {m.translatedText}
                </p>
              </div>
            ))}
            {interim && speakLang === "ar" && (
              <div className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-ink-muted">
                … {interim}
              </div>
            )}
            <div ref={rightBottomRef} />
          </div>
        </section>
      </div>
    </div>
  );
}

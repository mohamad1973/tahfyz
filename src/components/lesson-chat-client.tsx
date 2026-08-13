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
        results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
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
  currentUserId,
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
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastStamp = useRef<string | undefined>(undefined);

  const speakLang = role === "teacher" ? "ar" : "en";
  const speakLocale = role === "teacher" ? "ar-EG" : "en-US";

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
    }, 2500);
    return () => window.clearInterval(id);
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interim]);

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function startListening() {
    setError(null);
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError(
        lang === "ar"
          ? "المتصفح لا يدعم التعرف على الصوت. استخدم Chrome واكتب النص."
          : "Speech recognition is not supported. Use Chrome or type your message.",
      );
      return;
    }
    const rec = new Ctor();
    rec.lang = speakLocale;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk.trim()) {
        setText((prev) => `${prev} ${finalChunk}`.trim());
      }
      setInterim(interimChunk);
    };
    rec.onerror = (ev) => {
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
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function send() {
    const payload = text.trim();
    if (!payload) return;
    setError(null);
    stopListening();
    start(async () => {
      const res = await sendChatMessageAction({
        threadId,
        text: payload,
        originalLang: speakLang,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessages((prev) =>
        prev.some((m) => m.id === res.message.id)
          ? prev
          : [...prev, res.message],
      );
      lastStamp.current = res.message.createdAt;
      setText("");
      setInterim("");
    });
  }

  return (
    <div className="flex h-[min(70vh,640px)] flex-col rounded-2xl border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <div className="font-display text-lg text-olive-deep">
          {t.chatWith} {peerName}
        </div>
        <p className="text-xs text-ink-muted">
          {role === "student" ? t.micHintStudent : t.micHintTeacher}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-muted">
            {listening ? t.listening : t.holdToSpeak}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[90%] rounded-2xl border px-3 py-2 text-sm ${
                mine
                  ? "ml-auto border-olive/30 bg-olive/10"
                  : "mr-auto border-line bg-bg-deep"
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {m.originalLang === "en" ? "English" : "العربية"}
              </div>
              <p
                className="mt-0.5 whitespace-pre-wrap"
                dir={m.originalLang === "ar" ? "rtl" : "ltr"}
              >
                {m.originalText}
              </p>
              <div className="mt-2 border-t border-line/70 pt-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  {m.translatedLang === "en" ? "English" : "العربية"}
                </div>
                <p
                  className="mt-0.5 whitespace-pre-wrap text-ink-muted"
                  dir={m.translatedLang === "ar" ? "rtl" : "ltr"}
                >
                  {m.translatedText}
                </p>
              </div>
            </div>
          );
        })}
        {interim && (
          <div className="ml-auto max-w-[90%] rounded-2xl border border-dashed border-line px-3 py-2 text-sm text-ink-muted">
            … {interim}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => (listening ? stopListening() : startListening())}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              listening
                ? "bg-danger text-card"
                : "border border-line hover:bg-bg-deep"
            }`}
          >
            {listening ? t.listening : t.holdToSpeak}
          </button>
          <button
            type="button"
            disabled={pending || !text.trim()}
            onClick={send}
            className="rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card disabled:opacity-60"
          >
            {t.send}
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={t.typeMessage}
          dir={role === "teacher" ? "rtl" : "ltr"}
          className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}

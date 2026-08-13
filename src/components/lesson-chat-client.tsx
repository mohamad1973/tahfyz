"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import type { ChatMessage } from "@/lib/types";
import type { ChatLang } from "@/lib/translate";
import {
  clearChatThreadAction,
  deleteChatMessageAction,
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
  abort?: () => void;
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

function pickAudioMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function byNewest(a: ChatMessage, b: ChatMessage) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function LessonChatClient({
  threadId,
  peerName,
}: {
  threadId: string;
  currentUserId: string;
  role: "student" | "teacher";
  peerName: string;
}) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [holding, setHolding] = useState<ChatLang | null>(null);
  const [interim, setInterim] = useState("");
  const [pending, setPending] = useState<PendingBubble[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const [clearing, setClearing] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const holdingRef = useRef<ChatLang | null>(null);
  const finalsRef = useRef("");
  const interimRef = useRef("");
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stoppingRef = useRef(false);
  const speechDelayTimerRef = useRef<number | undefined>(undefined);
  const recorderMimeRef = useRef("audio/webm;codecs=opus");

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
  }

  function stopMediaTracks() {
    mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    mediaStreamRef.current = null;
  }

  function clearSpeechDelay() {
    if (speechDelayTimerRef.current) {
      window.clearTimeout(speechDelayTimerRef.current);
      speechDelayTimerRef.current = undefined;
    }
  }

  async function uploadAudioBlob(blob: Blob): Promise<string> {
    if (!blob.size || blob.size < 500) {
      throw new Error(
        lang === "ar" ? "التسجيل قصير أو فارغ" : "Recording too short or empty",
      );
    }
    // Keep full MIME including codecs for correct playback
    const fullType =
      blob.type || recorderMimeRef.current || "audio/webm;codecs=opus";
    const baseType = fullType.split(";")[0].trim() || "audio/webm";
    const ext = baseType.includes("mp4")
      ? "mp4"
      : baseType.includes("ogg")
        ? "ogg"
        : "webm";
    const pathname = `chat/${threadId}/rec-${Date.now()}.${ext}`;
    const file = new File([blob], `rec.${ext}`, { type: fullType });
    try {
      const result = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: fullType,
        clientPayload: JSON.stringify({
          kind: "chat-audio",
          threadId,
          title: "chat-recording",
        }),
      });
      return result.url;
    } catch {
      // Fallback without codec suffix if token allow-list is strict
      const file2 = new File([blob], `rec.${ext}`, { type: baseType });
      const result = await upload(pathname, file2, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: baseType,
        clientPayload: JSON.stringify({
          kind: "chat-audio",
          threadId,
          title: "chat-recording",
        }),
      });
      return result.url;
    }
  }

  function sendFinal(
    text: string,
    originalLang: ChatLang,
    audioBlob: Blob | null,
  ) {
    const payload = text.trim();
    if (!payload && !audioBlob?.size) return;
    const displayText =
      payload ||
      (lang === "ar" ? "(تسجيل صوتي)" : "(voice recording)");
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setPending((prev) => [
      { id: tempId, originalLang, text: displayText },
      ...prev,
    ]);
    setInterim("");

    sendQueueRef.current = sendQueueRef.current.then(async () => {
      setError(null);
      let audioUrl: string | undefined;
      if (audioBlob && audioBlob.size >= 500) {
        try {
          audioUrl = await uploadAudioBlob(audioBlob);
        } catch (e) {
          setError(
            lang === "ar"
              ? `فشل رفع الصوت: ${e instanceof Error ? e.message : "خطأ"}`
              : `Audio upload failed: ${e instanceof Error ? e.message : "error"}`,
          );
        }
      } else if (audioBlob && audioBlob.size > 0 && audioBlob.size < 500) {
        setError(
          lang === "ar"
            ? "التسجيل قصير جداً — اضغط مطوّلاً وتكلم ثم ارفع"
            : "Recording too short — hold longer while speaking",
        );
      }
      if (!payload) {
        setPending((prev) => prev.filter((p) => p.id !== tempId));
        if (!audioUrl) {
          setError(
            lang === "ar"
              ? "لم يُلتقط نص ولا صوت"
              : "No speech or audio captured",
          );
        }
        return;
      }
      const res = await sendChatMessageAction({
        threadId,
        text: payload,
        originalLang,
        audioUrl,
      });
      setPending((prev) => prev.filter((p) => p.id !== tempId));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!audioUrl) {
        setError(
          lang === "ar"
            ? "تم حفظ الترجمة لكن الصوت لم يُرفع بشكل صحيح — أعد التسجيل"
            : "Translation saved but audio failed — please record again",
        );
      }
      appendMessage(res.message);
    });
  }

  function stopRecorderToBlob(recorder: MediaRecorder): Promise<Blob | null> {
    return new Promise((resolve) => {
      const chunks: Blob[] = [];
      const mime =
        recorder.mimeType ||
        recorderMimeRef.current ||
        "audio/webm;codecs=opus";

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        resolve(blob.size >= 500 ? blob : blob.size > 0 ? blob : null);
      };
      recorder.onerror = () => resolve(null);

      try {
        if (recorder.state === "recording") {
          recorder.stop();
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });
  }

  function stopHoldAndTranslate() {
    if (stoppingRef.current) return;
    const side = holdingRef.current;
    if (!side) return;
    stoppingRef.current = true;
    holdingRef.current = null;
    setHolding(null);
    clearSpeechDelay();

    // Stop speech first to release mic conflict
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.abort?.();
      rec?.stop();
    } catch {
      /* ignore */
    }

    const text = `${finalsRef.current} ${interimRef.current}`.trim();
    finalsRef.current = "";
    interimRef.current = "";
    setInterim("");

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    const finish = (audioBlob: Blob | null) => {
      stopMediaTracks();
      stoppingRef.current = false;
      sendFinal(text, side, audioBlob);
    };

    if (recorder && recorder.state !== "inactive") {
      // Small delay so speech release settles before stopping the recorder
      window.setTimeout(() => {
        void stopRecorderToBlob(recorder).then((blob) => {
          if (blob && blob.size < 500) {
            setError(
              lang === "ar"
                ? "الصوت المسجّل ضعيف أو صامت — أعد المحاولة مع الإبقاء على الزر أثناء الكلام"
                : "Recorded audio is weak/silent — hold the button while speaking and try again",
            );
            finish(null);
            return;
          }
          finish(blob);
        });
      }, 80);
    } else {
      audioChunksRef.current = [];
      finish(null);
    }
  }

  function beginSpeechRecognition(Ctor: new () => SpeechRecognitionLike, side: ChatLang) {
    const rec = new Ctor();
    rec.lang = side === "ar" ? "ar-EG" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let interimChunk = "";
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const transcript = r[0].transcript;
        if (r.isFinal) finalChunk += `${transcript} `;
        else interimChunk += transcript;
      }
      if (finalChunk.trim()) {
        finalsRef.current = `${finalsRef.current} ${finalChunk}`.trim();
      }
      interimRef.current = interimChunk;
      setInterim(
        `${finalsRef.current}${interimChunk ? ` ${interimChunk}` : ""}`.trim(),
      );
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
    };
    rec.onend = () => {
      if (holdingRef.current === side) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore — recording can still succeed */
    }
  }

  async function startHold(side: ChatLang) {
    if (holdingRef.current || stoppingRef.current) return;
    setError(null);
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError(
        lang === "ar"
          ? "المتصفح لا يدعم التعرف على الصوت. استخدم Chrome."
          : "Speech recognition is not supported. Use Chrome.",
      );
      return;
    }

    finalsRef.current = "";
    interimRef.current = "";
    audioChunksRef.current = [];
    holdingRef.current = side;
    setHolding(side);
    setInterim("");
    clearSpeechDelay();

    // Start MediaRecorder first (before Web Speech) to reduce silent captures
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      if (holdingRef.current !== side) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const mime = pickAudioMime();
      recorderMimeRef.current = mime || "audio/webm;codecs=opus";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      setError(
        lang === "ar"
          ? "اسمح بالميكروفون لتسجيل الصوت"
          : "Allow microphone to record audio",
      );
      holdingRef.current = null;
      setHolding(null);
      return;
    }

    // Delay STT so MediaRecorder grabs the mic stream first
    speechDelayTimerRef.current = window.setTimeout(() => {
      if (holdingRef.current !== side) return;
      beginSpeechRecognition(Ctor, side);
    }, 150);
  }

  useEffect(() => {
    start(async () => {
      const res = await fetchChatMessagesAction(threadId);
      if (res.ok) setMessages(res.messages);
    });
  }, [threadId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const res = await fetchChatMessagesAction(threadId);
        if (!res.ok) return;
        setMessages(res.messages);
      })();
    }, 1000);
    return () => window.clearInterval(id);
  }, [threadId]);

  useEffect(() => {
    return () => {
      holdingRef.current = null;
      clearSpeechDelay();
      try {
        recognitionRef.current?.abort?.();
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      stopMediaTracks();
    };
  }, []);

  function onClearChat() {
    setClearing(true);
    start(async () => {
      const res = await clearChatThreadAction(threadId);
      setClearing(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessages([]);
      setPending([]);
      setInterim("");
      setError(null);
    });
  }

  function HoldButton({
    side,
    label,
  }: {
    side: ChatLang;
    label: string;
  }) {
    const active = holding === side;
    return (
      <button
        type="button"
        className={`select-none rounded-xl px-4 py-4 text-base font-semibold touch-none ${
          active
            ? "bg-danger text-card"
            : "bg-olive text-card hover:bg-olive-deep"
        }`}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
          void startHold(side);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          try {
            (e.currentTarget as HTMLButtonElement).releasePointerCapture(
              e.pointerId,
            );
          } catch {
            /* ignore */
          }
          stopHoldAndTranslate();
        }}
        onPointerCancel={() => stopHoldAndTranslate()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {active ? t.recording : label}
      </button>
    );
  }

  function onDeleteMessage(messageId: string) {
    start(async () => {
      const res = await deleteChatMessageAction(messageId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
  }

  function MessageCard({
    id,
    text,
    audioUrl,
    dir,
    cardClass,
  }: {
    id: string;
    text: string;
    audioUrl?: string;
    dir: "rtl" | "ltr";
    cardClass: string;
  }) {
    return (
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 whitespace-pre-wrap" dir={dir}>
            {text}
          </p>
          <button
            type="button"
            onClick={() => onDeleteMessage(id)}
            className="shrink-0 rounded-md border border-danger/30 px-2 py-1 text-[11px] font-semibold text-danger hover:bg-danger/10"
            title={t.deleteLine}
          >
            {t.deleteLine}
          </button>
        </div>
        {audioUrl ? (
          <audio
            controls
            preload="metadata"
            src={audioUrl}
            className="mt-2 w-full max-w-full"
          />
        ) : null}
      </div>
    );
  }

  function Pane({
    items,
    pendingItems,
    showInterim,
    dir,
    cardClass,
    empty,
    holdSide,
    holdLabel,
  }: {
    items: ChatMessage[];
    pendingItems: PendingBubble[];
    showInterim: boolean;
    dir: "rtl" | "ltr";
    cardClass: string;
    empty: string;
    holdSide: ChatLang;
    holdLabel: string;
  }) {
    return (
      <section className="flex min-h-0 flex-col" dir={dir}>
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
              <p className="mt-1 text-[11px] text-ink-muted">{t.uploadingAudio}</p>
            </div>
          ))}
          {items.map((m) => (
            <MessageCard
              key={m.id}
              id={m.id}
              text={m.translatedText}
              audioUrl={m.audioUrl}
              dir={dir}
              cardClass={cardClass}
            />
          ))}
          {items.length === 0 &&
            pendingItems.length === 0 &&
            !(showInterim && interim) && (
              <p className="text-center text-xs text-ink-muted">{empty}</p>
            )}
        </div>
        <div className="border-t border-line p-3">
          <p className="mb-2 text-center text-[11px] text-ink-muted">
            {t.holdToRecord}
          </p>
          <HoldButton side={holdSide} label={holdLabel} />
        </div>
      </section>
    );
  }

  return (
    <div className="flex h-[min(78vh,720px)] flex-col rounded-2xl border border-line bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="font-display text-lg text-olive-deep">
            {t.chatWith} {peerName}
          </div>
          <p className="text-xs text-ink-muted">{t.micHintBoth}</p>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
        <button
          type="button"
          disabled={clearing}
          onClick={onClearChat}
          className="rounded-xl border border-danger/40 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
        >
          {t.clearChat}
        </button>
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-line"
        dir="ltr"
      >
        <div className="flex min-h-0 flex-col border-r border-line">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            English → العربية
          </header>
          <Pane
            items={leftMessages}
            pendingItems={leftPending}
            showInterim={holding === "en"}
            dir="rtl"
            cardClass="rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            empty={t.paneLeftEmpty}
            holdSide="en"
            holdLabel={t.talk}
          />
        </div>
        <div className="flex min-h-0 flex-col">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            العربية → English
          </header>
          <Pane
            items={rightMessages}
            pendingItems={rightPending}
            showInterim={holding === "ar"}
            dir="ltr"
            cardClass="rounded-xl border border-olive/25 bg-olive/5 px-3 py-2 text-sm"
            empty={t.paneRightEmpty}
            holdSide="ar"
            holdLabel={t.speakAr}
          />
        </div>
      </div>
    </div>
  );
}

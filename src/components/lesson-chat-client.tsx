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

type PendingAudio = {
  originalLang: ChatLang;
  blob: Blob;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function isMobileCapture(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const ua = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return coarse || ua;
}

function pickAudioMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const mobile = isMobileCapture();
  const candidates = mobile
    ? [
        "audio/mp4",
        "audio/aac",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
      ]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function byNewest(a: ChatMessage, b: ChatMessage) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function messagesFingerprint(list: ChatMessage[]) {
  return list
    .map(
      (m) =>
        `${m.id}|${m.audioUrl ?? ""}|${m.translatedText}|${m.originalText}|${m.originalLang}|${m.createdAt}`,
    )
    .join("\n");
}

function MessageCard({
  id,
  originalText,
  translatedText,
  originalLang,
  audioUrl,
  paneDir,
  cardClass,
  deleteLabel,
  onDelete,
}: {
  id: string;
  originalText: string;
  translatedText: string;
  originalLang: ChatLang;
  audioUrl?: string;
  paneDir: "rtl" | "ltr";
  cardClass: string;
  deleteLabel: string;
  onDelete: (messageId: string) => void;
}) {
  const originalDir = originalLang === "ar" ? "rtl" : "ltr";
  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {originalText ? (
            <p
              className="whitespace-pre-wrap text-xs text-ink-muted"
              dir={originalDir}
            >
              {originalText}
            </p>
          ) : null}
          <p
            className="whitespace-pre-wrap text-sm font-medium text-ink"
            dir={paneDir}
          >
            {translatedText}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(id)}
          className="shrink-0 rounded-md border border-danger/30 px-2 py-1 text-[11px] font-semibold text-danger hover:bg-danger/10"
          title={deleteLabel}
        >
          {deleteLabel}
        </button>
      </div>
      {audioUrl ? (
        <audio
          controls
          preload="metadata"
          playsInline
          src={audioUrl}
          className="mt-2 w-full max-w-full"
        />
      ) : null}
    </div>
  );
}

function HoldButton({
  side,
  label,
  active,
  recordingLabel,
  toggleMode,
  onStart,
  onStop,
}: {
  side: ChatLang;
  label: string;
  active: boolean;
  recordingLabel: string;
  toggleMode: boolean;
  onStart: (side: ChatLang) => void;
  onStop: () => void;
}) {
  return (
    <button
      type="button"
      className={`w-full select-none rounded-xl px-4 py-3 text-base font-semibold touch-manipulation ${
        active
          ? "bg-danger text-card"
          : "bg-olive text-card hover:bg-olive-deep"
      }`}
      onClick={(e) => {
        if (!toggleMode) return;
        e.preventDefault();
        if (active) onStop();
        else onStart(side);
      }}
      onPointerDown={(e) => {
        if (toggleMode) return;
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onStart(side);
      }}
      onPointerUp={(e) => {
        if (toggleMode) return;
        e.preventDefault();
        try {
          (e.currentTarget as HTMLButtonElement).releasePointerCapture(
            e.pointerId,
          );
        } catch {
          /* ignore */
        }
        onStop();
      }}
      onPointerCancel={() => {
        if (!toggleMode) onStop();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {active ? recordingLabel : label}
    </button>
  );
}

function ChatPane({
  items,
  pendingItems,
  showInterim,
  interim,
  composerText,
  hasPendingAudio,
  dir,
  cardClass,
  empty,
  holdSide,
  holdLabel,
  holdActive,
  holdHint,
  recordingLabel,
  uploadingAudio,
  typePlaceholder,
  sendLabel,
  audioReadyHint,
  deleteLabel,
  toggleMode,
  onComposerChange,
  onSendText,
  onStartHold,
  onStopHold,
  onDeleteMessage,
  onClearPendingAudio,
}: {
  items: ChatMessage[];
  pendingItems: PendingBubble[];
  showInterim: boolean;
  interim: string;
  composerText: string;
  hasPendingAudio: boolean;
  dir: "rtl" | "ltr";
  cardClass: string;
  empty: string;
  holdSide: ChatLang;
  holdLabel: string;
  holdActive: boolean;
  holdHint: string;
  recordingLabel: string;
  uploadingAudio: string;
  typePlaceholder: string;
  sendLabel: string;
  audioReadyHint: string;
  deleteLabel: string;
  toggleMode: boolean;
  onComposerChange: (text: string) => void;
  onSendText: () => void;
  onStartHold: (side: ChatLang) => void;
  onStopHold: () => void;
  onDeleteMessage: (messageId: string) => void;
  onClearPendingAudio: () => void;
}) {
  const inputDir = holdSide === "ar" ? "rtl" : "ltr";
  return (
    <section className="flex min-h-[42vh] flex-1 flex-col md:min-h-0" dir={dir}>
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
            <p className="mt-1 text-[11px] text-ink-muted">{uploadingAudio}</p>
          </div>
        ))}
        {items.map((m) => (
          <MessageCard
            key={m.id}
            id={m.id}
            originalText={m.originalText}
            translatedText={m.translatedText}
            originalLang={m.originalLang}
            audioUrl={m.audioUrl}
            paneDir={dir}
            cardClass={cardClass}
            deleteLabel={deleteLabel}
            onDelete={onDeleteMessage}
          />
        ))}
        {items.length === 0 &&
          pendingItems.length === 0 &&
          !(showInterim && interim) && (
            <p className="text-center text-xs text-ink-muted">{empty}</p>
          )}
      </div>
      <div className="space-y-2 border-t border-line p-3">
        {hasPendingAudio ? (
          <p className="text-center text-[11px] text-olive">
            {audioReadyHint}{" "}
            <button
              type="button"
              className="underline"
              onClick={onClearPendingAudio}
            >
              ×
            </button>
          </p>
        ) : null}
        <div className="flex gap-2">
          <textarea
            value={composerText}
            onChange={(e) => onComposerChange(e.target.value)}
            rows={2}
            placeholder={typePlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            dir={inputDir}
          />
          <button
            type="button"
            onClick={onSendText}
            disabled={!composerText.trim()}
            className="shrink-0 self-stretch rounded-xl bg-olive px-3 py-2 text-sm font-semibold text-card disabled:opacity-50"
          >
            {sendLabel}
          </button>
        </div>
        <p className="text-center text-[11px] text-ink-muted">{holdHint}</p>
        <HoldButton
          side={holdSide}
          label={holdLabel}
          active={holdActive}
          recordingLabel={recordingLabel}
          toggleMode={toggleMode}
          onStart={onStartHold}
          onStop={onStopHold}
        />
      </div>
    </section>
  );
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
  const [toggleMode, setToggleMode] = useState(false);
  const [composerEn, setComposerEn] = useState("");
  const [composerAr, setComposerAr] = useState("");
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const holdingRef = useRef<ChatLang | null>(null);
  const finalsRef = useRef("");
  const interimRef = useRef("");
  const composerEnRef = useRef("");
  const composerArRef = useRef("");
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stoppingRef = useRef(false);
  const startingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const speechDelayTimerRef = useRef<number | undefined>(undefined);
  const recorderMimeRef = useRef("audio/webm;codecs=opus");
  const useSpeechDuringRecordRef = useRef(true);

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

  useEffect(() => {
    setToggleMode(isMobileCapture());
    useSpeechDuringRecordRef.current = !isMobileCapture();
  }, []);

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

  function getComposer(side: ChatLang) {
    return side === "en" ? composerEnRef.current : composerArRef.current;
  }

  function setComposer(side: ChatLang, text: string) {
    if (side === "en") {
      composerEnRef.current = text;
      setComposerEn(text);
    } else {
      composerArRef.current = text;
      setComposerAr(text);
    }
  }

  async function uploadAudioBlob(blob: Blob): Promise<string> {
    if (!blob.size || blob.size < 500) {
      throw new Error(
        lang === "ar" ? "التسجيل قصير أو فارغ" : "Recording too short or empty",
      );
    }
    const fullType =
      blob.type || recorderMimeRef.current || "audio/webm;codecs=opus";
    const baseType = fullType.split(";")[0].trim() || "audio/webm";
    const ext = baseType.includes("mp4")
      ? "mp4"
      : baseType.includes("ogg")
        ? "ogg"
        : "webm";
    const pathname = `chat/${threadId}/rec-${Date.now()}.${ext}`;
    // Prefer base MIME for storage Content-Type (browsers play better)
    const uploadType = baseType;
    const file = new File([blob], `rec.${ext}`, { type: uploadType });
    const result = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
      contentType: uploadType,
      clientPayload: JSON.stringify({
        kind: "chat-audio",
        threadId,
        title: "chat-recording",
      }),
    });
    return result.url;
  }

  function sendFinal(
    text: string,
    originalLang: ChatLang,
    audioBlob: Blob | null,
  ) {
    const payload = text.trim();
    if (!payload) {
      if (audioBlob && audioBlob.size >= 500) {
        setPendingAudio({ originalLang, blob: audioBlob });
        setError(
          lang === "ar"
            ? "الصوت جاهز — اكتب النص في الحقل ثم اضغط إرسال"
            : "Audio ready — type text in the box, then press Send",
        );
      } else {
        setError(
          lang === "ar"
            ? "اكتب نصاً في الحقل أو سجّل صوتاً أطول"
            : "Type text in the box or record longer audio",
        );
      }
      return;
    }

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setPending((prev) => [
      { id: tempId, originalLang, text: payload },
      ...prev,
    ]);
    setInterim("");
    setComposer(originalLang, "");
    setPendingAudio(null);

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
            ? "التسجيل قصير جداً — سجّل مدة أطول أثناء الكلام"
            : "Recording too short — record longer while speaking",
        );
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
        setComposer(originalLang, payload);
        return;
      }
      appendMessage(res.message);
    });
  }

  function sendComposer(side: ChatLang) {
    const text = getComposer(side);
    const audio =
      pendingAudio && pendingAudio.originalLang === side
        ? pendingAudio.blob
        : null;
    sendFinal(text, side, audio);
  }

  function stopRecorderToBlob(recorder: MediaRecorder): Promise<Blob | null> {
    return new Promise((resolve) => {
      const mime =
        recorder.mimeType ||
        recorderMimeRef.current ||
        "audio/webm;codecs=opus";

      // Keep existing handler that fills audioChunksRef — do not replace it
      const prevHandler = recorder.ondataavailable;
      recorder.ondataavailable = (ev) => {
        if (typeof prevHandler === "function") {
          prevHandler.call(recorder, ev);
        } else if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      const finish = () => {
        const chunks = audioChunksRef.current.slice();
        audioChunksRef.current = [];
        if (!chunks.length) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: mime });
        resolve(blob.size > 0 ? blob : null);
      };

      recorder.onstop = () => finish();
      recorder.onerror = () => finish();

      try {
        if (recorder.state === "recording") {
          recorder.stop();
        } else {
          finish();
        }
      } catch {
        finish();
      }
    });
  }

  function requestStopHold() {
    if (startingRef.current) {
      stopRequestedRef.current = true;
      return;
    }
    stopHoldAndTranslate();
  }

  function stopHoldAndTranslate() {
    if (stoppingRef.current) return;
    const side = holdingRef.current;
    if (!side) return;
    stoppingRef.current = true;
    holdingRef.current = null;
    setHolding(null);
    clearSpeechDelay();
    stopRequestedRef.current = false;

    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.abort?.();
      rec?.stop();
    } catch {
      /* ignore */
    }

    const speechText = `${finalsRef.current} ${interimRef.current}`.trim();
    finalsRef.current = "";
    interimRef.current = "";
    setInterim("");

    const typed = getComposer(side).trim();
    if (speechText && !typed) {
      setComposer(side, speechText);
    }
    const textForSend = (getComposer(side) || speechText).trim();

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    const finish = (audioBlob: Blob | null) => {
      stopMediaTracks();
      stoppingRef.current = false;
      sendFinal(textForSend, side, audioBlob);
    };

    if (recorder && recorder.state !== "inactive") {
      window.setTimeout(() => {
        void stopRecorderToBlob(recorder).then((blob) => {
          if (blob && blob.size < 500) {
            setError(
              lang === "ar"
                ? "الصوت المسجّل ضعيف — يمكنك إرسال النص من الحقل أو إعادة التسجيل"
                : "Audio is weak — send text from the box or record again",
            );
          }
          finish(blob);
        });
      }, 120);
    } else {
      audioChunksRef.current = [];
      finish(null);
    }
  }

  function beginSpeechRecognition(
    Ctor: new () => SpeechRecognitionLike,
    side: ChatLang,
  ) {
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
      /* ignore */
    }
  }

  async function startHold(side: ChatLang) {
    if (holdingRef.current || stoppingRef.current || startingRef.current) return;
    setError(null);

    if (typeof MediaRecorder === "undefined") {
      setError(
        lang === "ar"
          ? "هذا المتصفح لا يدعم تسجيل الصوت — اكتب في الحقل واضغط إرسال"
          : "This browser cannot record audio — type in the box and press Send",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        lang === "ar"
          ? "الميكروفون غير متاح — اكتب في الحقل واضغط إرسال"
          : "Microphone unavailable — type in the box and press Send",
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
    startingRef.current = true;
    stopRequestedRef.current = false;

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
        startingRef.current = false;
        return;
      }

      mediaStreamRef.current = stream;
      const mime = pickAudioMime();
      recorderMimeRef.current = mime || "audio/mp4";
      let recorder: MediaRecorder;
      try {
        recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mediaRecorderRef.current = recorder;
      // No timeslice — full blob on stop (avoids dropped / truncated audio)
      recorder.start();
    } catch {
      setError(
        lang === "ar"
          ? "اسمح بالميكروفون، أو اكتب في الحقل واضغط إرسال"
          : "Allow the microphone, or type in the box and press Send",
      );
      holdingRef.current = null;
      setHolding(null);
      startingRef.current = false;
      stopRequestedRef.current = false;
      return;
    }

    startingRef.current = false;

    if (stopRequestedRef.current) {
      stopHoldAndTranslate();
      return;
    }

    if (useSpeechDuringRecordRef.current) {
      const Ctor = getSpeechRecognition();
      if (Ctor) {
        speechDelayTimerRef.current = window.setTimeout(() => {
          if (holdingRef.current !== side) return;
          beginSpeechRecognition(Ctor, side);
        }, 150);
      }
    }
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
        setMessages((prev) =>
          messagesFingerprint(prev) === messagesFingerprint(res.messages)
            ? prev
            : res.messages,
        );
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
      setPendingAudio(null);
      setComposer("en", "");
      setComposer("ar", "");
      setError(null);
    });
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

  const holdHint = toggleMode ? t.tapToRecord : t.holdToRecord;
  const recordingLabel = toggleMode ? t.tapToStop : t.recording;
  const audioReadyHint = t.typeWhatYouSaid;

  return (
    <div className="flex h-[min(88vh,860px)] flex-col rounded-2xl border border-line bg-card md:h-[min(78vh,720px)]">
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
        className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0"
        dir="ltr"
      >
        <div className="flex min-h-0 flex-col md:border-r md:border-line">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            English → العربية
          </header>
          <ChatPane
            items={leftMessages}
            pendingItems={leftPending}
            showInterim={holding === "en"}
            interim={interim}
            composerText={composerEn}
            hasPendingAudio={pendingAudio?.originalLang === "en"}
            dir="rtl"
            cardClass="rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            empty={t.paneLeftEmpty}
            holdSide="en"
            holdLabel={t.talk}
            holdActive={holding === "en"}
            holdHint={holdHint}
            recordingLabel={recordingLabel}
            uploadingAudio={t.uploadingAudio}
            typePlaceholder={t.typeMessage}
            sendLabel={
              pendingAudio?.originalLang === "en" ? t.sendWithAudio : t.send
            }
            audioReadyHint={audioReadyHint}
            deleteLabel={t.deleteLine}
            toggleMode={toggleMode}
            onComposerChange={(text) => setComposer("en", text)}
            onSendText={() => sendComposer("en")}
            onStartHold={(side) => void startHold(side)}
            onStopHold={requestStopHold}
            onDeleteMessage={onDeleteMessage}
            onClearPendingAudio={() => setPendingAudio(null)}
          />
        </div>
        <div className="flex min-h-0 flex-col">
          <header className="border-b border-line bg-bg-deep/50 px-3 py-2 text-center text-xs font-semibold text-ink-muted">
            العربية → English
          </header>
          <ChatPane
            items={rightMessages}
            pendingItems={rightPending}
            showInterim={holding === "ar"}
            interim={interim}
            composerText={composerAr}
            hasPendingAudio={pendingAudio?.originalLang === "ar"}
            dir="ltr"
            cardClass="rounded-xl border border-olive/25 bg-olive/5 px-3 py-2 text-sm"
            empty={t.paneRightEmpty}
            holdSide="ar"
            holdLabel={t.speakAr}
            holdActive={holding === "ar"}
            holdHint={holdHint}
            recordingLabel={recordingLabel}
            uploadingAudio={t.uploadingAudio}
            typePlaceholder={t.typeMessage}
            sendLabel={
              pendingAudio?.originalLang === "ar" ? t.sendWithAudio : t.send
            }
            audioReadyHint={audioReadyHint}
            deleteLabel={t.deleteLine}
            toggleMode={toggleMode}
            onComposerChange={(text) => setComposer("ar", text)}
            onSendText={() => sendComposer("ar")}
            onStartHold={(side) => void startHold(side)}
            onStopHold={requestStopHold}
            onDeleteMessage={onDeleteMessage}
            onClearPendingAudio={() => setPendingAudio(null)}
          />
        </div>
      </div>
    </div>
  );
}

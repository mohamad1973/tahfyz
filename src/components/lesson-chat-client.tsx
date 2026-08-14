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

function collapseRepeatedSpeech(text: string): string {
  let s = text.replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Drop consecutive duplicate words: "ذلك ذلك الكتاب" → "ذلك الكتاب"
  const words = s.split(" ");
  const deduped: string[] = [];
  for (const w of words) {
    if (deduped.length && deduped[deduped.length - 1] === w) continue;
    deduped.push(w);
  }
  s = deduped.join(" ");
  // Drop repeated phrases of 2–6 words: "ذلك الكتاب ذلك الكتاب" → "ذلك الكتاب"
  for (let n = 6; n >= 2; n--) {
    const re = new RegExp(
      `((?:[^\\s]+\\s+){${n - 1}}[^\\s]+)(?:\\s+\\1)+`,
      "gu",
    );
    s = s.replace(re, "$1");
  }
  return s.trim();
}

function mergeSpeechChunk(prev: string, chunk: string): string {
  const c = chunk.trim();
  if (!c) return prev.trim();
  if (!prev.trim()) return collapseRepeatedSpeech(c);
  if (prev.endsWith(c) || c === prev) return collapseRepeatedSpeech(prev);
  const prevWords = prev.trim().split(/\s+/);
  const chunkWords = c.split(/\s+/);
  let overlap = 0;
  const max = Math.min(prevWords.length, chunkWords.length);
  for (let i = 1; i <= max; i++) {
    if (prevWords.slice(-i).join(" ") === chunkWords.slice(0, i).join(" ")) {
      overlap = i;
    }
  }
  return collapseRepeatedSpeech(
    `${prev} ${chunkWords.slice(overlap).join(" ")}`.trim(),
  );
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
  onStart,
  onStop,
  onTouchUi,
}: {
  side: ChatLang;
  label: string;
  active: boolean;
  recordingLabel: string;
  onStart: (side: ChatLang) => void;
  onStop: () => void;
  onTouchUi?: (touch: boolean) => void;
}) {
  const touchModeRef = useRef(false);

  return (
    <button
      type="button"
      className={`w-full select-none rounded-xl px-2 py-3 text-sm font-semibold touch-manipulation sm:px-4 sm:py-3 sm:text-base ${
        active
          ? "bg-danger text-card"
          : "bg-olive text-card hover:bg-olive-deep"
      }`}
      onPointerDown={(e) => {
        // Touch/pen: tap-to-toggle via click — avoid hold race (down+up before mic opens)
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          touchModeRef.current = true;
          onTouchUi?.(true);
          return;
        }
        touchModeRef.current = false;
        onTouchUi?.(false);
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onStart(side);
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") return;
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
      onPointerCancel={(e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") return;
        onStop();
      }}
      onClick={(e) => {
        // Only touch/pen toggles on click; mouse uses hold and must ignore click
        if (!touchModeRef.current) return;
        e.preventDefault();
        if (active) onStop();
        else onStart(side);
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
  onComposerChange,
  onSendText,
  onStartHold,
  onStopHold,
  onDeleteMessage,
  onClearPendingAudio,
  onTouchUi,
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
  onComposerChange: (text: string) => void;
  onSendText: () => void;
  onStartHold: (side: ChatLang) => void;
  onStopHold: () => void;
  onDeleteMessage: (messageId: string) => void;
  onClearPendingAudio: () => void;
  onTouchUi?: (touch: boolean) => void;
}) {
  const inputDir = holdSide === "ar" ? "rtl" : "ltr";
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!hasPendingAudio) return;
    const el = composerRef.current;
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hasPendingAudio]);

  return (
    <section className="flex min-h-0 flex-1 flex-col" dir={dir}>
      <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3">
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
      <div className="space-y-2 border-t border-line p-2 sm:p-3">
        {hasPendingAudio ? (
          <p className="text-center text-[10px] text-olive sm:text-[11px]">
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
        <div className="flex gap-1.5 sm:gap-2">
          <textarea
            ref={composerRef}
            value={composerText}
            onChange={(e) => onComposerChange(e.target.value)}
            rows={2}
            placeholder={typePlaceholder}
            className={`min-w-0 flex-1 rounded-lg border bg-bg px-2 py-1.5 text-xs sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm ${
              hasPendingAudio
                ? "border-olive ring-2 ring-olive/30"
                : "border-line"
            }`}
            dir={inputDir}
          />
          <button
            type="button"
            onClick={onSendText}
            disabled={!composerText.trim()}
            className="shrink-0 self-stretch rounded-lg bg-olive px-2 py-1.5 text-xs font-semibold text-card disabled:opacity-50 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
          >
            {sendLabel}
          </button>
        </div>
        <p className="text-center text-[10px] text-ink-muted sm:text-[11px]">
          {holdHint}
        </p>
        <HoldButton
          side={holdSide}
          label={holdLabel}
          active={holdActive}
          recordingLabel={recordingLabel}
          onStart={onStartHold}
          onStop={onStopHold}
          onTouchUi={onTouchUi}
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
  const [touchUi, setTouchUi] = useState(false);
  const [micStatus, setMicStatus] = useState<
    "idle" | "requesting" | "denied" | "dead" | "live"
  >("idle");
  const [composerEn, setComposerEn] = useState("");
  const [composerAr, setComposerAr] = useState("");
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const holdingRef = useRef<ChatLang | null>(null);
  const finalsRef = useRef("");
  const sessionFinalsRef = useRef("");
  const interimRef = useRef("");
  const composerEnRef = useRef("");
  const composerArRef = useRef("");
  const composerLockedRef = useRef(false);
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stoppingRef = useRef(false);
  const startingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const speechDelayTimerRef = useRef<number | undefined>(undefined);
  const recorderMimeRef = useRef("audio/webm;codecs=opus");
  const useSpeechDuringRecordRef = useRef(true);
  const lastTalkSideRef = useRef<ChatLang>("ar");

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
    setTouchUi(isMobileCapture());
    useSpeechDuringRecordRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return;
    }
    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;
    const onChange = () => {
      if (!permissionStatus) return;
      if (permissionStatus.state === "denied") setMicStatus("denied");
      else setMicStatus((s) => (s === "denied" ? "idle" : s));
    };
    void navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permissionStatus = status;
        if (status.state === "denied") setMicStatus("denied");
        status.addEventListener("change", onChange);
      })
      .catch(() => {
        /* permissions API unsupported */
      });
    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener("change", onChange);
    };
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

  function updateComposerFromSpeech(side: ChatLang, text: string) {
    if (composerLockedRef.current) return;
    setComposer(side, text);
  }

  function onComposerEdit(side: ChatLang, text: string) {
    if (holdingRef.current === side) {
      composerLockedRef.current = true;
    }
    setComposer(side, text);
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
    const payload = collapseRepeatedSpeech(text.trim());
    if (!payload) {
      if (audioBlob && audioBlob.size >= 500) {
        setPendingAudio({ originalLang, blob: audioBlob });
        setError(t.typeWhatYouSaid);
      } else {
        setError(t.noSpeechHeard);
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
      let settled = false;

      const settle = () => {
        if (settled) return;
        settled = true;
        const chunks = audioChunksRef.current.slice();
        audioChunksRef.current = [];
        if (!chunks.length) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: mime });
        resolve(blob.size > 0 ? blob : null);
      };

      // Keep collecting into audioChunksRef; wait past onstop for final chunk
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        window.setTimeout(settle, 80);
      };
      recorder.onerror = () => {
        window.setTimeout(settle, 80);
      };

      try {
        if (recorder.state === "recording" || recorder.state === "paused") {
          recorder.stop();
        } else {
          window.setTimeout(settle, 80);
        }
      } catch {
        window.setTimeout(settle, 80);
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
    const voiceNoteMode = touchUi || isMobileCapture();

    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.abort?.();
      rec?.stop();
    } catch {
      /* ignore */
    }

    let textForSend = "";
    if (!voiceNoteMode) {
      const speechText = collapseRepeatedSpeech(
        `${finalsRef.current} ${sessionFinalsRef.current} ${interimRef.current}`.trim(),
      );
      if (speechText && !composerLockedRef.current) {
        setComposer(side, speechText);
      } else if (speechText && !getComposer(side).trim()) {
        setComposer(side, speechText);
      }
      textForSend = collapseRepeatedSpeech(
        (getComposer(side).trim() || speechText).trim(),
      );
    }
    finalsRef.current = "";
    sessionFinalsRef.current = "";
    interimRef.current = "";
    setInterim("");

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    const finish = (audioBlob: Blob | null) => {
      stopMediaTracks();
      stoppingRef.current = false;
      composerLockedRef.current = false;
      setMicStatus((s) =>
        s === "live" || s === "requesting" ? "idle" : s,
      );

      // Mobile voice-note: attach audio only — user types/edits then presses Send
      if (voiceNoteMode) {
        if (audioBlob && audioBlob.size >= 500) {
          setPendingAudio({ originalLang: side, blob: audioBlob });
          setError(t.typeWhatYouSaid);
        } else if (audioBlob && audioBlob.size > 0 && audioBlob.size < 500) {
          setError(
            lang === "ar"
              ? "الصوت المسجّل ضعيف — سجّل مدة أطول ثم اكتب الجملة وأرسل"
              : "Audio is weak — record longer, then type the sentence and Send",
          );
        } else {
          setError(
            lang === "ar"
              ? "لم يُسجَّل صوت — اضغط تحدث مجدداً أو اكتب وأرسل"
              : "No audio recorded — tap Talk again or type and Send",
          );
        }
        return;
      }

      sendFinal(textForSend, side, audioBlob);
    };

    if (recorder && recorder.state !== "inactive") {
      window.setTimeout(() => {
        void stopRecorderToBlob(recorder).then((blob) => {
          if (!voiceNoteMode && blob && blob.size < 500) {
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
    rec.lang = side === "ar" ? "ar-SA" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let sessionFinals = "";
      let interimChunk = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        const transcript = r[0]?.transcript ?? "";
        if (r.isFinal) sessionFinals += `${transcript} `;
        else interimChunk += transcript;
      }
      sessionFinalsRef.current = collapseRepeatedSpeech(sessionFinals);
      interimRef.current = interimChunk.trim();
      const display = collapseRepeatedSpeech(
        `${finalsRef.current} ${sessionFinalsRef.current} ${interimChunk}`.trim(),
      );
      setInterim(display);
      updateComposerFromSpeech(side, display);
    };
    rec.onerror = (ev) => {
      if (ev.error === "aborted" || ev.error === "no-speech") return;
      setError(
        ev.error === "not-allowed"
          ? lang === "ar"
            ? "اسمح بالميكروفون من المتصفح"
            : "Allow microphone access in the browser"
          : ev.error === "service-not-allowed" || ev.error === "network"
            ? t.speechUnsupported
            : ev.error,
      );
      if (ev.error === "not-allowed") setMicStatus("denied");
    };
    rec.onend = () => {
      if (holdingRef.current !== side) return;
      // Commit this recognition segment once, then restart without re-stacking duplicates
      finalsRef.current = mergeSpeechChunk(
        finalsRef.current,
        sessionFinalsRef.current,
      );
      sessionFinalsRef.current = "";
      try {
        rec.start();
      } catch {
        /* ignore */
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
    if (holdingRef.current || stoppingRef.current || startingRef.current) {
      return;
    }
    setError(null);
    lastTalkSideRef.current = side;

    const Ctor = getSpeechRecognition();
    const canRecord =
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    const voiceNoteMode = touchUi || isMobileCapture();

    // Mobile: audio-only voice note — never start Web Speech (mic conflict)
    if (voiceNoteMode) {
      if (!canRecord) {
        setError(
          lang === "ar"
            ? "التسجيل غير متاح — اكتب في الحقل واضغط إرسال"
            : "Recording unavailable — type in the box and press Send",
        );
        return;
      }
    } else if (!canRecord && !Ctor) {
      setError(
        lang === "ar"
          ? "لا يتوفر تسجيل ولا تعرف صوت — اكتب في الحقل واضغط إرسال"
          : "No recorder or speech recognition — type in the box and press Send",
      );
      return;
    }

    finalsRef.current = "";
    sessionFinalsRef.current = "";
    interimRef.current = "";
    audioChunksRef.current = [];
    composerLockedRef.current = false;
    holdingRef.current = side;
    setHolding(side);
    setInterim("");
    clearSpeechDelay();
    startingRef.current = true;
    stopRequestedRef.current = false;

    let recorderStarted = false;

    if (canRecord) {
      setMicStatus("requesting");
      try {
        // CRITICAL: do not await anything before getUserMedia (Safari user-gesture)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        });

        const liveTracks = stream
          .getAudioTracks()
          .filter((tr) => tr.readyState === "live" && tr.enabled);

        if (!liveTracks.length) {
          stream.getTracks().forEach((tr) => tr.stop());
          setMicStatus("dead");
          setError(t.micDeadHelp);
          holdingRef.current = null;
          setHolding(null);
          startingRef.current = false;
          stopRequestedRef.current = false;
          return;
        }

        if (holdingRef.current !== side) {
          stream.getTracks().forEach((tr) => tr.stop());
          startingRef.current = false;
          setMicStatus("idle");
          return;
        }

        mediaStreamRef.current = stream;
        setMicStatus("live");
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
        recorder.start();
        recorderStarted = true;
      } catch {
        setMicStatus("denied");
        setError(t.micDeniedHelp);
        holdingRef.current = null;
        setHolding(null);
        startingRef.current = false;
        stopRequestedRef.current = false;
        return;
      }
    }

    startingRef.current = false;

    if (stopRequestedRef.current) {
      stopHoldAndTranslate();
      return;
    }

    // Desktop only: STT after recorder owns the mic
    if (!voiceNoteMode && Ctor && useSpeechDuringRecordRef.current) {
      speechDelayTimerRef.current = window.setTimeout(() => {
        if (holdingRef.current !== side) return;
        beginSpeechRecognition(Ctor, side);
      }, recorderStarted ? 150 : 0);
    } else if (!voiceNoteMode && !recorderStarted && !Ctor) {
      holdingRef.current = null;
      setHolding(null);
      setMicStatus((s) => (s === "live" ? "idle" : s));
      setError(
        lang === "ar"
          ? "تعذر بدء التسجيل — اكتب في الحقل واضغط إرسال"
          : "Could not start recording — type in the box and press Send",
      );
    } else if (voiceNoteMode && !recorderStarted) {
      holdingRef.current = null;
      setHolding(null);
      setMicStatus("idle");
      setError(
        lang === "ar"
          ? "تعذر بدء التسجيل — اكتب في الحقل واضغط إرسال"
          : "Could not start recording — type in the box and press Send",
      );
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

  const holdHint = touchUi ? t.tapToRecord : t.holdToRecord;
  const recordingLabel =
    micStatus === "requesting"
      ? t.requestingMic
      : touchUi
        ? t.tapToStop
        : t.recording;
  const audioReadyHint = t.typeWhatYouSaid;
  const showMicRetry = micStatus === "denied" || micStatus === "dead";

  return (
    <div className="flex h-[min(88vh,860px)] flex-col rounded-2xl border border-line bg-card md:h-[min(78vh,720px)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg text-olive-deep">
            {t.chatWith} {peerName}
          </div>
          <p className="text-xs text-ink-muted">{t.micHintBoth}</p>
          {micStatus === "requesting" && (
            <p className="mt-1 text-xs text-olive">{t.requestingMic}</p>
          )}
          {micStatus === "live" && holding && (
            <p className="mt-1 text-xs text-olive">
              {lang === "ar" ? "الميكروفون مفتوح — يسجّل" : "Microphone open — recording"}
            </p>
          )}
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          {showMicRetry && (
            <button
              type="button"
              className="mt-2 rounded-lg border border-olive/40 px-3 py-1.5 text-xs font-semibold text-olive hover:bg-olive/10"
              onClick={() => {
                setError(null);
                setMicStatus("idle");
                void startHold(lastTalkSideRef.current);
              }}
            >
              {t.micRetry}
            </button>
          )}
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
          <header className="border-b border-line bg-bg-deep/50 px-2 py-2 text-center text-[11px] font-semibold text-ink-muted sm:px-3 sm:text-xs">
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
            holdActive={
              holding === "en" ||
              (micStatus === "requesting" && lastTalkSideRef.current === "en")
            }
            holdHint={holdHint}
            recordingLabel={recordingLabel}
            uploadingAudio={t.uploadingAudio}
            typePlaceholder={t.typeMessage}
            sendLabel={
              pendingAudio?.originalLang === "en" ? t.sendWithAudio : t.send
            }
            audioReadyHint={audioReadyHint}
            deleteLabel={t.deleteLine}
            onComposerChange={(text) => onComposerEdit("en", text)}
            onSendText={() => sendComposer("en")}
            onStartHold={(side) => void startHold(side)}
            onStopHold={requestStopHold}
            onDeleteMessage={onDeleteMessage}
            onClearPendingAudio={() => setPendingAudio(null)}
            onTouchUi={setTouchUi}
          />
        </div>
        <div className="flex min-h-0 flex-col">
          <header className="border-b border-line bg-bg-deep/50 px-2 py-2 text-center text-[11px] font-semibold text-ink-muted sm:px-3 sm:text-xs">
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
            holdActive={
              holding === "ar" ||
              (micStatus === "requesting" && lastTalkSideRef.current === "ar")
            }
            holdHint={holdHint}
            recordingLabel={recordingLabel}
            uploadingAudio={t.uploadingAudio}
            typePlaceholder={t.typeMessage}
            sendLabel={
              pendingAudio?.originalLang === "ar" ? t.sendWithAudio : t.send
            }
            audioReadyHint={audioReadyHint}
            deleteLabel={t.deleteLine}
            onComposerChange={(text) => onComposerEdit("ar", text)}
            onSendText={() => sendComposer("ar")}
            onStartHold={(side) => void startHold(side)}
            onStopHold={requestStopHold}
            onDeleteMessage={onDeleteMessage}
            onClearPendingAudio={() => setPendingAudio(null)}
            onTouchUi={setTouchUi}
          />
        </div>
      </div>
    </div>
  );
}

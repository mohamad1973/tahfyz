"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  addLessonCallIceAction,
  endLessonCallAction,
  fetchLessonCallAction,
  markLessonCallLiveAction,
  sendChatMessageAction,
  setLessonCallAnswerAction,
  startLessonCallOfferAction,
  transcribeChatAudioAction,
} from "@/lib/actions";
import { useI18n } from "@/lib/i18n/provider";
import type { ChatLang } from "@/lib/translate";
import type { IceCandidateJson, LessonCallState } from "@/lib/types";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

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

export function LessonLiveCall({
  threadId,
  currentUserId,
  role,
}: {
  threadId: string;
  currentUserId: string;
  role: "student" | "teacher";
}) {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<
    "idle" | "connecting" | "waiting" | "live" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [captionNote, setCaptionNote] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingOfferIce = useRef(0);
  const pendingAnswerIce = useRef(0);
  const isOffererRef = useRef(false);
  const joinedRef = useRef(false);
  const endingRef = useRef(false);
  const captionBusyRef = useRef(false);

  const talkLang: ChatLang = role === "teacher" ? "ar" : "en";

  const cleanupMedia = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => {
      try {
        s.track?.stop();
      } catch {
        /* ignore */
      }
    });
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    localStreamRef.current = null;
    joinedRef.current = false;
    isOffererRef.current = false;
  }, []);

  const applyRemoteIce = useCallback(async (call: LessonCallState) => {
    const pc = pcRef.current;
    if (!pc) return;
    const remote = isOffererRef.current ? call.answerIce : call.offerIce;
    const seen = isOffererRef.current
      ? pendingAnswerIce
      : pendingOfferIce;
    for (let i = seen.current; i < remote.length; i++) {
      const c = remote[i];
      if (!c?.candidate) continue;
      try {
        await pc.addIceCandidate(
          new RTCIceCandidate({
            candidate: c.candidate ?? undefined,
            sdpMid: c.sdpMid ?? undefined,
            sdpMLineIndex: c.sdpMLineIndex ?? undefined,
          }),
        );
      } catch {
        /* candidate may arrive early */
      }
    }
    seen.current = remote.length;
  }, []);

  const startCaptionLoop = useCallback(
    (stream: MediaStream) => {
      const mime = pickAudioMime();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let recorder: MediaRecorder | null = null;
      let chunks: Blob[] = [];
      let speaking = false;
      let silenceMs = 0;
      let lastTs = performance.now();

      const tick = () => {
        if (!joinedRef.current) {
          try {
            recorder?.stop();
          } catch {
            /* ignore */
          }
          void ctx.close();
          return;
        }
        const now = performance.now();
        const dt = now - lastTs;
        lastTs = now;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) {
          const n = (v - 128) / 128;
          sum += n * n;
        }
        const rms = Math.sqrt(sum / data.length);
        const loud = rms > 0.045;
        if (loud) {
          silenceMs = 0;
          if (!speaking && typeof MediaRecorder !== "undefined") {
            speaking = true;
            chunks = [];
            try {
              recorder = mime
                ? new MediaRecorder(stream, { mimeType: mime })
                : new MediaRecorder(stream);
              recorder.ondataavailable = (ev) => {
                if (ev.data.size) chunks.push(ev.data);
              };
              recorder.start(200);
            } catch {
              speaking = false;
            }
          }
        } else if (speaking) {
          silenceMs += dt;
          if (silenceMs >= 1300 && recorder && recorder.state !== "inactive") {
            const rec = recorder;
            speaking = false;
            recorder = null;
            rec.onstop = () => {
              const blob = new Blob(chunks, {
                type: rec.mimeType || mime || "audio/webm",
              });
              chunks = [];
              void processCaption(blob);
            };
            rec.stop();
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      async function processCaption(blob: Blob) {
        if (captionBusyRef.current) return;
        if (!blob.size || blob.size < 900) return;
        captionBusyRef.current = true;
        setCaptionNote(
          lang === "ar" ? "يحوّل الكلام إلى نص…" : "Transcribing…",
        );
        try {
          const fullType = blob.type || mime || "audio/webm";
          const baseType = fullType.split(";")[0].trim() || "audio/webm";
          const ext = baseType.includes("mp4")
            ? "mp4"
            : baseType.includes("ogg")
              ? "ogg"
              : "webm";
          const file = new File([blob], `live.${ext}`, { type: baseType });
          const uploaded = await upload(
            `chat/${threadId}/live-${Date.now()}.${ext}`,
            file,
            {
              access: "public",
              handleUploadUrl: "/api/blob/upload",
              contentType: baseType,
              clientPayload: JSON.stringify({
                kind: "chat-audio",
                threadId,
                title: "live-caption",
              }),
            },
          );
          const stt = await transcribeChatAudioAction({
            threadId,
            audioUrl: uploaded.url,
            originalLang: talkLang,
          });
          if (stt.ok && stt.text.trim()) {
            await sendChatMessageAction({
              threadId,
              text: stt.text.trim(),
              originalLang: talkLang,
              audioUrl: uploaded.url,
            });
            setCaptionNote(null);
          } else {
            setCaptionNote(
              lang === "ar"
                ? "لم يُفهم المقطع — يمكنك الكتابة في العمود"
                : "Clip not understood — you can type in the column",
            );
          }
        } catch {
          setCaptionNote(
            lang === "ar" ? "تعذر تحويل المقطع" : "Could not transcribe clip",
          );
        } finally {
          captionBusyRef.current = false;
        }
      }
    },
    [lang, talkLang, threadId],
  );

  const attachPc = useCallback(
    async (offerer: boolean) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      isOffererRef.current = offerer;
      pendingOfferIce.current = 0;
      pendingAnswerIce.current = 0;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (ev) => {
        const el = remoteAudioRef.current;
        if (!el) return;
        el.srcObject = ev.streams[0] || new MediaStream([ev.track]);
        void el.play().catch(() => {
          /* user gesture already happened */
        });
      };
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        void addLessonCallIceAction({
          threadId,
          side: offerer ? "offer" : "answer",
          candidate: ev.candidate.toJSON() as IceCandidateJson,
        });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("live");
          void markLessonCallLiveAction(threadId);
        }
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          if (!endingRef.current && joinedRef.current) {
            setStatus("idle");
            cleanupMedia();
          }
        }
      };
      startCaptionLoop(stream);
      return pc;
    },
    [cleanupMedia, startCaptionLoop, threadId],
  );

  const startAsOfferer = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    joinedRef.current = true;
    try {
      const pc = await attachPc(true);
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      const res = await startLessonCallOfferAction({
        threadId,
        offerSdp: offer.sdp || "",
      });
      if (!res.ok) {
        setError(res.error);
        cleanupMedia();
        setStatus("idle");
        return;
      }
      setStatus("waiting");
    } catch {
      cleanupMedia();
      setStatus("error");
      setError(t.liveCallMicError);
    }
  }, [attachPc, cleanupMedia, t.liveCallMicError, threadId]);

  const joinAsAnswerer = useCallback(
    async (call: LessonCallState) => {
      if (!call.offerSdp || joinedRef.current) return;
      setError(null);
      setStatus("connecting");
      joinedRef.current = true;
      try {
        const pc = await attachPc(false);
        await pc.setRemoteDescription({ type: "offer", sdp: call.offerSdp });
        await applyRemoteIce(call);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const res = await setLessonCallAnswerAction({
          threadId,
          answerSdp: answer.sdp || "",
        });
        if (!res.ok) {
          setError(res.error);
          cleanupMedia();
          setStatus("idle");
        }
      } catch {
        cleanupMedia();
        setStatus("error");
        setError(t.liveCallMicError);
      }
    },
    [applyRemoteIce, attachPc, cleanupMedia, t.liveCallMicError, threadId],
  );

  useEffect(() => {
    void (async () => {
      const res = await fetchLessonCallAction(threadId);
      if (
        res.ok &&
        res.call?.offerSdp &&
        res.call.startedById !== currentUserId &&
        !res.call.answerSdp &&
        !joinedRef.current
      ) {
        setStatus("waiting");
      }
    })();
    const id = window.setInterval(() => {
      void (async () => {
        const res = await fetchLessonCallAction(threadId);
        if (!res.ok || !res.call) return;
        const call = res.call;
        if (call.status === "ended") {
          if (joinedRef.current) {
            endingRef.current = true;
            cleanupMedia();
            setStatus("idle");
            endingRef.current = false;
          }
          return;
        }
        if (
          !joinedRef.current &&
          call.offerSdp &&
          call.startedById !== currentUserId &&
          !call.answerSdp
        ) {
          setStatus("waiting");
          return;
        }
        if (joinedRef.current && isOffererRef.current && call.answerSdp) {
          const pc = pcRef.current;
          if (pc && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription({
              type: "answer",
              sdp: call.answerSdp,
            });
          }
        }
        if (joinedRef.current) await applyRemoteIce(call);
      })();
    }, 1000);
    return () => window.clearInterval(id);
  }, [applyRemoteIce, cleanupMedia, currentUserId, threadId]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  async function onEnd() {
    endingRef.current = true;
    await endLessonCallAction(threadId);
    cleanupMedia();
    setStatus("idle");
    setCaptionNote(null);
    endingRef.current = false;
  }

  const incoming =
    status === "waiting" && !joinedRef.current
      ? lang === "ar"
        ? "الطرف الآخر بدأ الحصة — اضغط انضمام"
        : "Peer started the lesson — tap Join"
      : null;

  return (
    <div className="mb-3 rounded-2xl border border-olive/25 bg-olive/5 px-3 py-3 sm:px-4">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-olive">
            {lang === "ar" ? "حصة صوتية تجريبية" : "Trial live lesson"}
          </p>
          <p className="text-[11px] text-ink-muted">{t.liveCallHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "idle" || status === "error" || incoming ? (
            <button
              type="button"
              onClick={() => {
                if (incoming) {
                  void (async () => {
                    const res = await fetchLessonCallAction(threadId);
                    if (res.ok && res.call) await joinAsAnswerer(res.call);
                  })();
                } else {
                  void startAsOfferer();
                }
              }}
              className="rounded-xl bg-olive px-3 py-2 text-sm font-semibold text-card hover:bg-olive-deep"
            >
              {incoming ? t.joinLiveCall : t.startLiveCall}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onEnd()}
              className="rounded-xl border border-danger/40 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              {t.endLiveCall}
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-olive">
        {status === "connecting"
          ? t.liveCallConnecting
          : status === "waiting" && joinedRef.current
            ? t.liveCallNeedPeer
            : status === "live"
              ? t.liveCallLive
              : incoming
                ? incoming
                : null}
      </p>
      {captionNote ? (
        <p className="mt-1 text-xs text-ink-muted">{captionNote}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}

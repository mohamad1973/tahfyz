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
  speakTranslatedMessageAction,
  startLessonCallOfferAction,
  transcribeChatAudioAction,
  translateChatMessageAction,
} from "@/lib/actions";
import { useI18n } from "@/lib/i18n/provider";
import type { ChatLang } from "@/lib/translate";
import type { IceCandidateJson, LessonCallState } from "@/lib/types";
import { fetchRtcIceConfig, waitForIceGathering } from "@/lib/webrtc-ice";

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

function isJoinableCall(call: LessonCallState) {
  return (
    Boolean(call.offerSdp) &&
    (call.status === "waiting" || call.status === "ringing")
  );
}

function isMicDomError(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  return (
    name === "NotAllowedError" ||
    name === "NotFoundError" ||
    name === "AbortError" ||
    name === "SecurityError" ||
    name === "NotReadableError" ||
    name === "OverconstrainedError"
  );
}

async function micPermissionGranted(): Promise<boolean> {
  try {
    const st = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return st.state === "granted";
  } catch {
    return false;
  }
}

async function getMicStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  } catch (first) {
    if (
      first instanceof DOMException &&
      (first.name === "NotAllowedError" || first.name === "SecurityError")
    ) {
      throw first;
    }
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
  }
}

export function LessonLiveCall({
  threadId,
  currentUserId: _currentUserId,
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
  const [needsMicTap, setNeedsMicTap] = useState(false);
  const [offerReady, setOfferReady] = useState(false);
  const [storedOffer, setStoredOffer] = useState<LessonCallState | null>(null);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [hearingFailed, setHearingFailed] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingOfferIce = useRef(0);
  const pendingAnswerIce = useRef(0);
  const isOffererRef = useRef(false);
  const joinedRef = useRef(false);
  const endingRef = useRef(false);
  const captionBusyRef = useRef(false);
  const joiningRef = useRef(false);
  const micBlockedRef = useRef(false);
  const tapJoinPausedRef = useRef(false);
  const latestCallRef = useRef<LessonCallState | null>(null);
  const callGenRef = useRef(0);
  const sawActiveCallRef = useRef(false);
  const sessionReadyRef = useRef(false);

  const talkLang: ChatLang = role === "teacher" ? "ar" : "en";

  const cleanupMedia = useCallback(() => {
    callGenRef.current += 1;
    const pc = pcRef.current;
    pcRef.current = null;
    pc?.getSenders().forEach((s) => {
      try {
        s.track?.stop();
      } catch {
        /* ignore */
      }
    });
    try {
      pc?.close();
    } catch {
      /* ignore */
    }
    localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    localStreamRef.current = null;
    joinedRef.current = false;
    isOffererRef.current = false;
    joiningRef.current = false;
    sessionReadyRef.current = false;
  }, []);

  const playRemote = useCallback(async () => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    try {
      await el.play();
      setNeedsPlay(false);
    } catch {
      setNeedsPlay(true);
    }
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
            const sent = await sendChatMessageAction({
              threadId,
              text: stt.text.trim(),
              originalLang: talkLang,
              audioUrl: uploaded.url,
            });
            if (sent.ok) {
              void (async () => {
                const translated = await translateChatMessageAction({
                  messageId: sent.message.id,
                });
                if (!translated.ok) return;
                const spoken = translated.message.translatedText.trim();
                if (
                  !spoken ||
                  spoken === translated.message.originalText.trim()
                ) {
                  return;
                }
                await speakTranslatedMessageAction({
                  messageId: sent.message.id,
                });
              })();
            }
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
    async (offerer: boolean, gen: number) => {
      const icePromise = fetchRtcIceConfig();
      const stream = await getMicStream();
      if (callGenRef.current !== gen) {
        stream.getTracks().forEach((tr) => tr.stop());
        throw new DOMException("Call superseded", "AbortError");
      }
      const ice = await icePromise;
      if (callGenRef.current !== gen) {
        stream.getTracks().forEach((tr) => tr.stop());
        throw new DOMException("Call superseded", "AbortError");
      }
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection(ice);
      pcRef.current = pc;
      isOffererRef.current = offerer;
      pendingOfferIce.current = 0;
      pendingAnswerIce.current = 0;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (ev) => {
        if (pc !== pcRef.current || callGenRef.current !== gen) return;
        const el = remoteAudioRef.current;
        if (!el) return;
        const incoming =
          ev.streams[0] || new MediaStream(ev.track ? [ev.track] : []);
        el.srcObject = incoming;
        el.autoplay = true;
        el.setAttribute("playsinline", "true");
        el.muted = false;
        el.volume = 1;
        void playRemote();
      };
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        if (pc !== pcRef.current || callGenRef.current !== gen) return;
        void addLessonCallIceAction({
          threadId,
          side: offerer ? "offer" : "answer",
          candidate: ev.candidate.toJSON() as IceCandidateJson,
        });
      };
      pc.onconnectionstatechange = () => {
        if (pc !== pcRef.current || callGenRef.current !== gen) return;
        if (pc.connectionState === "connected") {
          setStatus("live");
          setHearingFailed(false);
          void markLessonCallLiveAction(threadId);
          void playRemote();
        }
        if (pc.connectionState === "failed" && sessionReadyRef.current) {
          setHearingFailed(true);
          setError(t.liveCallNoAudio);
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc !== pcRef.current || callGenRef.current !== gen) return;
        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          setStatus("live");
          void playRemote();
        }
        if (pc.iceConnectionState === "failed" && sessionReadyRef.current) {
          setHearingFailed(true);
          setError(t.liveCallNoAudio);
        }
      };
      startCaptionLoop(stream);
      return pc;
    },
    [playRemote, startCaptionLoop, t.liveCallNoAudio, threadId],
  );

  const startAsOfferer = useCallback(async () => {
    if (role !== "teacher") return;
    cleanupMedia();
    const gen = callGenRef.current;
    endingRef.current = false;
    sawActiveCallRef.current = false;
    setError(null);
    setNeedsMicTap(false);
    setHearingFailed(false);
    setStatus("connecting");
    joinedRef.current = true;
    try {
      const pc = await attachPc(true, gen);
      if (callGenRef.current !== gen) return;
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);
      if (callGenRef.current !== gen) return;
      const offerSdp = pc.localDescription?.sdp || offer.sdp || "";
      const res = await startLessonCallOfferAction({
        threadId,
        offerSdp,
      });
      if (callGenRef.current !== gen) return;
      if (!res.ok) {
        setError(res.error);
        cleanupMedia();
        setStatus("idle");
        return;
      }
      sawActiveCallRef.current = true;
      sessionReadyRef.current = true;
      setStatus("waiting");
    } catch {
      if (callGenRef.current !== gen) return;
      cleanupMedia();
      setStatus("error");
      setError(t.liveCallMicError);
    }
  }, [attachPc, cleanupMedia, role, t.liveCallMicError, threadId]);

  const joinAsAnswerer = useCallback(
    async (call: LessonCallState) => {
      if (!call.offerSdp) {
        joiningRef.current = false;
        setNeedsMicTap(true);
        setStatus("idle");
        setError(t.liveCallJoinRetry);
        return;
      }
      cleanupMedia();
      const gen = callGenRef.current;
      joiningRef.current = true;
      endingRef.current = false;
      sessionReadyRef.current = false;
      setError(null);
      setStatus("connecting");
      try {
        const pc = await attachPc(false, gen);
        if (callGenRef.current !== gen) return;
        joinedRef.current = true;
        micBlockedRef.current = false;
        setNeedsMicTap(false);
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: "offer",
            sdp: call.offerSdp,
          }),
        );
        await applyRemoteIce(call);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGathering(pc);
        if (callGenRef.current !== gen) return;
        void playRemote();
        const answerSdp = pc.localDescription?.sdp || answer.sdp || "";
        const res = await setLessonCallAnswerAction({
          threadId,
          answerSdp,
        });
        if (callGenRef.current !== gen) return;
        if (!res.ok) {
          tapJoinPausedRef.current = true;
          setNeedsMicTap(true);
          setError(res.error);
          cleanupMedia();
          setStatus("idle");
        } else {
          sawActiveCallRef.current = true;
          sessionReadyRef.current = true;
          tapJoinPausedRef.current = false;
          setNeedsMicTap(false);
        }
      } catch (err) {
        if (callGenRef.current !== gen) return;
        tapJoinPausedRef.current = true;
        cleanupMedia();
        setNeedsMicTap(true);
        setStatus("idle");
        if (isMicDomError(err)) {
          const name = err instanceof DOMException ? err.name : "";
          setError(
            name === "NotAllowedError" || name === "SecurityError"
              ? t.liveCallMicError
              : t.liveCallJoinRetry,
          );
        } else {
          setError(t.liveCallJoinRetry);
        }
      } finally {
        joiningRef.current = false;
      }
    },
    [
      applyRemoteIce,
      attachPc,
      cleanupMedia,
      playRemote,
      t.liveCallJoinRetry,
      t.liveCallMicError,
      threadId,
    ],
  );

  useEffect(() => {
    const tick = async () => {
      const res = await fetchLessonCallAction(threadId);
      if (!res.ok || !res.call) return;
      const call = res.call;
      if (call.status === "ended") {
        latestCallRef.current = null;
        setStoredOffer(null);
        setOfferReady(false);
        setNeedsMicTap(false);
        if (joinedRef.current && sawActiveCallRef.current) {
          endingRef.current = true;
          cleanupMedia();
          sawActiveCallRef.current = false;
          setStatus("idle");
          setNeedsPlay(false);
          setHearingFailed(false);
          endingRef.current = false;
        }
        return;
      }
      if (
        call.status === "waiting" ||
        call.status === "ringing" ||
        call.status === "live"
      ) {
        if (joinedRef.current) sawActiveCallRef.current = true;
      }
      if (role === "student") {
        const joinable = isJoinableCall(call);
        latestCallRef.current = joinable ? call : latestCallRef.current;
        setStoredOffer(joinable ? call : null);
        setOfferReady(joinable && !joinedRef.current);
        if (
          joinable &&
          !joinedRef.current &&
          !joiningRef.current
        ) {
          if (!tapJoinPausedRef.current && (await micPermissionGranted())) {
            await joinAsAnswerer(call);
          } else {
            setNeedsMicTap(true);
          }
          return;
        }
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
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1000);
    return () => window.clearInterval(id);
  }, [applyRemoteIce, cleanupMedia, joinAsAnswerer, role, threadId]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  useEffect(() => {
    if (status === "live") void playRemote();
  }, [playRemote, status]);

  useEffect(() => {
    if (!needsPlay) return;
    const id = window.setInterval(() => void playRemote(), 2500);
    return () => window.clearInterval(id);
  }, [needsPlay, playRemote]);

  async function onEnd() {
    endingRef.current = true;
    sawActiveCallRef.current = false;
    callGenRef.current += 1;
    await endLessonCallAction(threadId);
    cleanupMedia();
    setStatus("idle");
    setCaptionNote(null);
    setNeedsMicTap(false);
    setOfferReady(false);
    setStoredOffer(null);
    setNeedsPlay(false);
    setHearingFailed(false);
    micBlockedRef.current = false;
    tapJoinPausedRef.current = false;
    endingRef.current = false;
  }

  const showTeacherStart =
    role === "teacher" &&
    (status === "idle" || status === "error");
  const inSession =
    status === "connecting" || status === "waiting" || status === "live";
  const showAllowMic =
    role === "student" &&
    (needsMicTap || offerReady) &&
    status !== "connecting" &&
    status !== "live";

  return (
    <div className="mb-3 rounded-2xl border border-olive/25 bg-olive/5 px-3 py-3 sm:px-4">
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-olive">
            {lang === "ar" ? "حصة صوتية تجريبية" : "Trial live lesson"}
          </p>
          <p className="text-[11px] text-ink-muted">{t.liveCallHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showTeacherStart ? (
            <button
              type="button"
              onClick={() => void startAsOfferer()}
              className="rounded-xl bg-olive px-3 py-2 text-sm font-semibold text-card hover:bg-olive-deep"
            >
              {t.startLiveCall}
            </button>
          ) : null}
          {showAllowMic ? (
            <button
              type="button"
              onClick={() => {
                micBlockedRef.current = false;
                tapJoinPausedRef.current = false;
                joiningRef.current = false;
                setError(null);
                setStatus("connecting");
                void playRemote();
                const call = storedOffer ?? latestCallRef.current;
                if (!call?.offerSdp) {
                  setNeedsMicTap(true);
                  setStatus("idle");
                  setError(t.liveCallJoinRetry);
                  return;
                }
                joiningRef.current = true;
                void joinAsAnswerer(call);
              }}
              className="rounded-xl bg-olive px-3 py-2 text-sm font-semibold text-card hover:bg-olive-deep"
            >
              {t.liveCallAllowMic}
            </button>
          ) : null}
          {status === "live" || needsPlay || hearingFailed ? (
            <button
              type="button"
              onClick={() => void playRemote()}
              className="rounded-xl bg-olive px-3 py-2 text-sm font-semibold text-card hover:bg-olive-deep"
            >
              {t.liveCallPlayAudio}
            </button>
          ) : null}
          {inSession && !showAllowMic ? (
            <button
              type="button"
              onClick={() => void onEnd()}
              className="rounded-xl border border-danger/40 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              {t.endLiveCall}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs text-olive">
        {status === "connecting"
          ? t.liveCallConnecting
          : status === "waiting"
            ? t.liveCallNeedPeer
            : status === "live"
              ? t.liveCallLive
              : role === "student" && (offerReady || needsMicTap)
                ? t.liveCallSheikhStarted
                : role === "student"
                  ? t.liveCallStudentWait
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

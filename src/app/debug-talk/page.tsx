"use client";

import { useRef, useState } from "react";

function dbgLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  const payload = {
    sessionId: "362d99",
    runId: "pre-fix",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  const body = JSON.stringify(payload);
  fetch("http://127.0.0.1:7455/ingest/bf789d1d-73ab-44fd-9ed0-8caeb6b2dbaf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "362d99",
    },
    body,
  }).catch(() => {});
  fetch("/api/debug-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}

/** Isolated page to reproduce mobile Talk mic without auth. */
export default function DebugTalkPage() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const touchModeRef = useRef(false);
  const startingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    dbgLog("C", "debug-talk:start", "start called", {
      starting: startingRef.current,
      active,
      secure: window.isSecureContext,
      hasGUM: !!navigator.mediaDevices?.getUserMedia,
      hasMR: typeof MediaRecorder !== "undefined",
    });
    if (startingRef.current) return;
    startingRef.current = true;
    setStatus("requesting");
    setActive(true);
    try {
      // Fixed path: getUserMedia immediately (no await before it)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const live = stream
        .getAudioTracks()
        .filter((t) => t.readyState === "live" && t.enabled);
      dbgLog("D", "debug-talk:gum", "gum ok", {
        live: live.length,
        states: stream.getAudioTracks().map((t) => t.readyState),
      });
      if (!live.length) {
        setStatus("dead");
        startingRef.current = false;
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorderRef.current = rec;
      rec.start();
      setStatus("live");
      startingRef.current = false;
    } catch (e) {
      dbgLog("D", "debug-talk:gumFail", "gum fail", {
        name: e instanceof Error ? e.name : String(e),
        message: e instanceof Error ? e.message : String(e),
      });
      setStatus("denied");
      setActive(false);
      startingRef.current = false;
    }
  }

  function stop() {
    dbgLog("E", "debug-talk:stop", "stop", {
      chunks: chunksRef.current.length,
      state: recorderRef.current?.state ?? null,
    });
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current);
        dbgLog("F", "debug-talk:blob", "blob", { size: blob.size });
        setStatus(`stopped size=${blob.size}`);
        setActive(false);
      };
      rec.stop();
    } else {
      setActive(false);
      setStatus("stopped-empty");
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-xl font-bold">Debug Talk (mobile mic)</h1>
      <p className="text-sm">status: {status}</p>
      <button
        type="button"
        className={`w-full rounded-xl px-4 py-4 text-lg font-semibold ${
          active ? "bg-red-600 text-white" : "bg-green-700 text-white"
        }`}
        onPointerDown={(e) => {
          dbgLog("A", "debug-talk:pointerdown", "pd", {
            pointerType: e.pointerType,
            active,
          });
          if (e.pointerType === "touch" || e.pointerType === "pen") {
            touchModeRef.current = true;
            return;
          }
          touchModeRef.current = false;
          void start();
        }}
        onPointerUp={(e) => {
          dbgLog("A", "debug-talk:pointerup", "pu", {
            pointerType: e.pointerType,
          });
          if (e.pointerType === "touch" || e.pointerType === "pen") return;
          stop();
        }}
        onClick={() => {
          dbgLog("B", "debug-talk:click", "click", {
            touchMode: touchModeRef.current,
            active,
          });
          if (!touchModeRef.current) return;
          if (active) stop();
          else void start();
        }}
      >
        {active ? "إيقاف" : "تحدث"}
      </button>
    </main>
  );
}

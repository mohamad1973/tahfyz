const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs = 3000,
): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export async function fetchRtcIceConfig(): Promise<RTCConfiguration> {
  try {
    const res = await fetch("/api/webrtc/ice", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { iceServers?: RTCIceServer[] };
      if (Array.isArray(data.iceServers) && data.iceServers.length) {
        return { iceServers: data.iceServers, iceCandidatePoolSize: 4 };
      }
    }
  } catch {
    /* use STUN fallback */
  }
  return { iceServers: STUN_SERVERS, iceCandidatePoolSize: 4 };
}

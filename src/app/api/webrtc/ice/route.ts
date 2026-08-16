import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const STUN: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

function turnFromEnv(): IceServer[] {
  const urls = (process.env.TURN_URLS || process.env.NEXT_PUBLIC_TURN_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const username =
    process.env.TURN_USERNAME || process.env.NEXT_PUBLIC_TURN_USERNAME || "";
  const credential =
    process.env.TURN_CREDENTIAL || process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "";
  if (!urls.length || !username || !credential) return [];
  return [{ urls, username, credential }];
}

async function meteredTurn(): Promise<IceServer[]> {
  const token = process.env.METERED_TURN_TOKEN?.trim();
  if (!token) return [];
  const domain = (process.env.METERED_TURN_DOMAIN || "").trim();
  const url = domain
    ? `https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(token)}`
    : `https://metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as IceServer[] | { iceServers?: IceServer[] };
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.iceServers)) return data.iceServers;
  } catch {
    /* ignore */
  }
  return [];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const iceServers = [...STUN, ...turnFromEnv(), ...(await meteredTurn())];
  return NextResponse.json({ iceServers, hasTurn: iceServers.length > STUN.length });
}

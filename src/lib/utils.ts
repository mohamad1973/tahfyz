import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Simple non-crypto hash for MVP local auth (replace with bcrypt + Supabase in production) */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`tahfyz:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

export const HOLD_HOURS = 24;
export const EGYPT_TZ = "Africa/Cairo";

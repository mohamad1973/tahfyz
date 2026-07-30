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

/** Lowercase letters, digits, underscore; 3–32 chars */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  return /^[a-z0-9_]{3,32}$/.test(normalizeUsername(raw));
}

export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";
  const base = local.slice(0, 24) || "user";
  return base.length >= 3 ? base : `${base}123`.slice(0, 32);
}

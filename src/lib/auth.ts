import { cookies } from "next/headers";
import { getUserById } from "./store";
import type { Role, User } from "./types";

const COOKIE = "tahfyz_session";

export type Session = {
  userId: string;
  role: Role;
  email: string;
  name: string;
};

function encode(session: Session): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decode(value: string): Session | null {
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Session;
  } catch {
    return null;
  }
}

export async function setSession(user: User) {
  const jar = await cookies();
  const session: Session = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
  jar.set(COOKIE, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return decode(raw);
}

export async function requireSession(roles?: Role[]): Promise<{
  session: Session;
  user: User;
}> {
  const { redirect } = await import("next/navigation");
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const user = await getUserById(session!.userId);
  if (!user) {
    redirect("/login");
  }
  if (roles && !roles.includes(user!.role)) {
    redirect(dashboardPath(user!.role));
  }
  return { session: session!, user: user! };
}

export function dashboardPath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    case "parent":
      return "/parent";
  }
}

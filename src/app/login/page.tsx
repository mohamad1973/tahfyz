"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { loginAction, registerParentAction } from "@/lib/actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "parent">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="font-display text-3xl font-semibold text-olive-deep">
        Tahfyz
      </Link>
      <div className="mt-8 w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-lg">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold ${mode === "login" ? "bg-olive text-card" : "bg-bg-deep"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("parent")}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold ${mode === "parent" ? "bg-olive text-card" : "bg-bg-deep"}`}
          >
            Parent register
          </button>
        </div>

        {mode === "login" ? (
          <form
            action={(fd) => {
              setError(null);
              start(async () => {
                const res = await loginAction(fd);
                if (res && !res.ok) setError(res.error);
              });
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Password</span>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-olive py-2.5 text-sm font-semibold text-card disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-xs text-ink-muted leading-relaxed">
              Demo: admin@tahfyz.com / admin123 · teachers: ahmed@tahfyz.com /
              teacher123 (and 7 more @tahfyz.com)
            </p>
          </form>
        ) : (
          <form
            action={(fd) => {
              setError(null);
              start(async () => {
                const res = await registerParentAction(fd);
                if (res && !res.ok) setError(res.error);
              });
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Full name</span>
              <input
                name="name"
                required
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Password</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-olive py-2.5 text-sm font-semibold text-card disabled:opacity-60"
            >
              Create parent account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

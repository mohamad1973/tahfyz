"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  loginAction,
  registerParentAction,
  registerStudentAction,
} from "@/lib/actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "student" | "parent">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="font-display text-3xl font-semibold text-olive-deep">
        Tahfyz
      </Link>
      <div className="mt-8 w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-lg">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(
            [
              ["login", "Sign in"],
              ["student", "Student"],
              ["parent", "Parent"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-xl py-2 text-xs font-semibold sm:text-sm ${
                mode === key ? "bg-olive text-card" : "bg-bg-deep"
              }`}
            >
              {label}
            </button>
          ))}
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
              <span className="mb-1 block font-medium">Username</span>
              <input
                name="username"
                required
                autoComplete="username"
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
              Demo: admin / admin123 · teachers: ahmed / teacher123
            </p>
          </form>
        ) : mode === "student" ? (
          <form
            action={(fd) => {
              setError(null);
              start(async () => {
                const res = await registerStudentAction(fd);
                if (res && !res.ok) setError(res.error);
              });
            }}
            className="space-y-3"
          >
            <p className="text-sm text-ink-muted">
              Create your own student account — no parent required. Use the same
              email you book with so your lessons and chat connect.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Full name</span>
              <input
                name="name"
                required
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Username</span>
              <input
                name="username"
                required
                pattern="[a-zA-Z0-9_]{3,32}"
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email (recommended)</span>
              <input
                name="email"
                type="email"
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
              Create student account
            </button>
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
              <span className="mb-1 block font-medium">Username</span>
              <input
                name="username"
                required
                pattern="[a-zA-Z0-9_]{3,32}"
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email (optional)</span>
              <input
                name="email"
                type="email"
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

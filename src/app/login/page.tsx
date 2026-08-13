"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  loginAction,
  registerParentAction,
  registerStudentAction,
} from "@/lib/actions";
import { useI18n } from "@/lib/i18n/provider";

type Mode = "login" | "student" | "parent";

export default function LoginPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="font-display text-3xl font-semibold text-olive-deep">
        Tahfyz
      </Link>
      <div className="mt-8 w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-lg">
        <div className="mb-4 grid grid-cols-3 gap-1">
          {(
            [
              ["login", t.signIn],
              ["student", t.studentRegister],
              ["parent", t.parentRegister],
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

        {mode === "login" && (
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
              <span className="mb-1 block font-medium">{t.username}</span>
              <input
                name="username"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.password}</span>
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
              {t.signIn}
            </button>
            <p className="text-center text-xs">
              <Link href="/forgot-password" className="underline">
                {t.forgotPassword}
              </Link>
            </p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Demo: admin / admin123 · teachers: ahmed / 123456
            </p>
          </form>
        )}

        {mode === "student" && (
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
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.fullName}</span>
              <input name="name" required className="w-full rounded-xl border border-line bg-bg px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.username}</span>
              <input
                name="username"
                required
                pattern="[a-zA-Z0-9_]{3,32}"
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.emailOptional}</span>
              <input name="email" type="email" className="w-full rounded-xl border border-line bg-bg px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.password}</span>
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
              {t.createStudent}
            </button>
          </form>
        )}

        {mode === "parent" && (
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
            <p className="text-xs text-ink-muted leading-relaxed">{t.parentHelp}</p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.fullName}</span>
              <input name="name" required className="w-full rounded-xl border border-line bg-bg px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.username}</span>
              <input
                name="username"
                required
                pattern="[a-zA-Z0-9_]{3,32}"
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.emailOptional}</span>
              <input name="email" type="email" className="w-full rounded-xl border border-line bg-bg px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t.password}</span>
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
              {t.createParent}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

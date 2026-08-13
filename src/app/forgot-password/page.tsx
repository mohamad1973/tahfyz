"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/lib/actions";
import { useI18n } from "@/lib/i18n/provider";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/login" className="text-sm underline">
        ← {t.signIn}
      </Link>
      <h1 className="mt-4 font-display text-3xl text-olive-deep">
        {t.forgotPassword}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {t.email} — {t.sendResetLink}
      </p>
      <form
        className="mt-6 space-y-3"
        action={(fd) => {
          setMsg(null);
          setError(null);
          start(async () => {
            const res = await requestPasswordResetAction(fd);
            if (!res.ok) setError(res.error);
            else setMsg(res.message);
          });
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t.email}</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-olive py-2.5 text-sm font-semibold text-card disabled:opacity-60"
        >
          {t.sendResetLink}
        </button>
        {msg && <p className="text-sm text-ok">{msg}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  );
}

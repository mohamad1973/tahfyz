"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { resetPasswordWithTokenAction } from "@/lib/actions";
import { useI18n } from "@/lib/i18n/provider";

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-6 space-y-3"
      action={(fd) => {
        setError(null);
        start(async () => {
          fd.set("token", token);
          const res = await resetPasswordWithTokenAction(fd);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          router.push("/login");
        });
      }}
    >
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t.newPassword}</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full rounded-xl border border-line bg-bg px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t.confirmPassword}</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={6}
          className="w-full rounded-xl border border-line bg-bg px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !token}
        className="w-full rounded-xl bg-olive py-2.5 text-sm font-semibold text-card disabled:opacity-60"
      >
        {t.savePassword}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/login" className="text-sm underline">
        ← {t.signIn}
      </Link>
      <h1 className="mt-4 font-display text-3xl text-olive-deep">
        {t.resetPassword}
      </h1>
      <Suspense fallback={<p className="mt-4 text-sm">…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}

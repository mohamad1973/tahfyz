"use client";

import { useState, useTransition } from "react";
import { updateAccountCredentialsAction } from "@/lib/actions";

export function AccountCredentialsForm({
  userId,
  username,
  mode,
}: {
  userId: string;
  username: string;
  mode: "self" | "admin";
}) {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="font-display text-xl">
        {mode === "admin" ? "حساب الدخول (يوزرنيم / باسورد)" : "حسابي"}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        الدخول للموقع بيوزرنيم وكلمة مرور — مش شرط إيميل.
      </p>
      <form
        className="mt-4 space-y-3"
        action={(fd) => {
          setError(null);
          setMsg(null);
          start(async () => {
            const res = await updateAccountCredentialsAction(fd);
            if (!res.ok) setError(res.error);
            else setMsg("تم حفظ بيانات الدخول");
          });
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Username</span>
          <input
            name="username"
            defaultValue={username}
            required
            pattern="[a-zA-Z0-9_]{3,32}"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        {mode === "self" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">كلمة المرور الحالية</span>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full rounded-xl border border-line bg-bg px-3 py-2"
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">
            كلمة مرور جديدة {mode === "admin" ? "(اتركها فارغة للإبقاء)" : "(اختياري)"}
          </span>
          <input
            name="password"
            type="password"
            minLength={6}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">تأكيد كلمة المرور</span>
          <input
            name="confirm"
            type="password"
            minLength={6}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card disabled:opacity-60"
        >
          حفظ الحساب
        </button>
        {msg && <p className="text-sm text-ok">{msg}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </section>
  );
}

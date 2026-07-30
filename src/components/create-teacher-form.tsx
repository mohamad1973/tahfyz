"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTeacherAccountAction } from "@/lib/actions";

export function CreateTeacherForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-4 grid gap-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-2"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await createTeacherAccountAction(fd);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          router.push(`/admin/teachers/${res.teacherId}`);
        });
      }}
    >
      <h2 className="font-display text-lg sm:col-span-2">إضافة شيخ جديد</h2>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">الاسم EN</span>
        <input
          name="name"
          required
          className="w-full rounded-xl border border-line bg-bg px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">الاسم عربي</span>
        <input
          name="nameAr"
          required
          dir="rtl"
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
        <span className="mb-1 block font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full rounded-xl border border-line bg-bg px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">سعر الساعة USD</span>
        <input
          name="priceUsd"
          type="number"
          min={1}
          defaultValue={25}
          className="w-full rounded-xl border border-line bg-bg px-3 py-2"
        />
      </label>
      <div className="flex items-end sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card disabled:opacity-60"
        >
          إنشاء الشيخ
        </button>
      </div>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
    </form>
  );
}

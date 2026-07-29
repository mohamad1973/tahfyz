"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { Teacher } from "@/lib/types";
import {
  deleteTeacherMediaAction,
  updateTeacherProfileAction,
  uploadTeacherMediaAction,
  uploadTeacherPhotoAction,
} from "@/lib/actions";

export function TeacherProfileEditor({ teacher }: { teacher: Teacher }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-xl">ملفي الشخصي</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <div className="relative h-36 w-28 overflow-hidden rounded-xl bg-bg-deep">
            <Image
              src={teacher.photoUrl}
              alt={teacher.name}
              fill
              className="object-cover object-top"
            />
          </div>
          <form
            className="flex-1 space-y-2"
            action={(fd) => {
              setError(null);
              setMsg(null);
              start(async () => {
                const res = await uploadTeacherPhotoAction(fd);
                if (!res.ok) setError(res.error);
                else setMsg("تم تحديث الصورة");
              });
            }}
          >
            <label className="block text-sm font-medium">رفع صورة جديدة</label>
            <input
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="block w-full text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-olive px-3 py-1.5 text-sm font-semibold text-card disabled:opacity-60"
            >
              حفظ الصورة
            </button>
          </form>
        </div>

        <form
          className="mt-6 space-y-3"
          action={(fd) => {
            setError(null);
            setMsg(null);
            start(async () => {
              await updateTeacherProfileAction(fd);
              setMsg("تم حفظ المعلومات");
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">الاسم (EN)</span>
              <input
                name="name"
                defaultValue={teacher.name}
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">الاسم (عربي)</span>
              <input
                name="nameAr"
                defaultValue={teacher.nameAr}
                dir="rtl"
                className="w-full rounded-xl border border-line bg-bg px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">نبذة EN</span>
            <textarea
              name="bio"
              rows={3}
              defaultValue={teacher.bio}
              className="w-full rounded-xl border border-line bg-bg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">نبذة عربي</span>
            <textarea
              name="bioAr"
              rows={3}
              dir="rtl"
              defaultValue={teacher.bioAr}
              className="w-full rounded-xl border border-line bg-bg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              المواد (مفصولة بفاصلة)
            </span>
            <input
              name="subjects"
              defaultValue={teacher.subjects.join(", ")}
              className="w-full rounded-xl border border-line bg-bg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">سعر الساعة (USD)</span>
            <input
              name="priceUsd"
              type="number"
              min={1}
              step={1}
              defaultValue={teacher.priceUsd ?? 25}
              className="w-full rounded-xl border border-line bg-bg px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card disabled:opacity-60"
          >
            حفظ المعلومات
          </button>
        </form>
        {msg && <p className="mt-2 text-sm text-ok">{msg}</p>}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </section>

      <MediaSection
        kind="video"
        title="فيديوهات البروفايل"
        items={teacher.videos || []}
        accept="video/mp4,video/webm"
      />
      <MediaSection
        kind="audio"
        title="صوتيات البروفايل"
        items={teacher.audios || []}
        accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a"
      />
    </div>
  );
}

function MediaSection({
  kind,
  title,
  items,
  accept,
}: {
  kind: "video" | "audio";
  title: string;
  items: { id: string; title: string; url: string }[];
  accept: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-ink-muted">لا ملفات بعد.</li>
        )}
        {items.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
          >
            <a href={m.url} target="_blank" rel="noreferrer" className="underline">
              {m.title}
            </a>
            <form
              action={(fd) => {
                start(async () => {
                  await deleteTeacherMediaAction(fd);
                });
              }}
            >
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="mediaId" value={m.id} />
              <button type="submit" className="text-xs text-danger">
                حذف
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 space-y-2"
        action={(fd) => {
          setError(null);
          start(async () => {
            const res = await uploadTeacherMediaAction(fd);
            if (!res.ok) setError(res.error);
          });
        }}
      >
        <input type="hidden" name="kind" value={kind} />
        <input
          name="title"
          placeholder="عنوان الملف"
          className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
        />
        <input name="file" type="file" accept={accept} required className="block w-full text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-olive px-3 py-1.5 text-sm font-semibold text-card disabled:opacity-60"
        >
          رفع
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </section>
  );
}

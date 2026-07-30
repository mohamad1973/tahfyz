"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import type { Teacher } from "@/lib/types";
import {
  deleteTeacherMediaAction,
  saveTeacherMediaUrlAction,
  saveTeacherPhotoUrlAction,
  updateTeacherProfileAction,
} from "@/lib/actions";

const PHOTO_MAX = 2 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const AUDIO_MAX = 15 * 1024 * 1024;

function safeFileName(name: string) {
  return (name || "upload.bin").replace(/\s+/g, "-");
}

export function TeacherProfileEditor({
  teacher,
  mode = "self",
}: {
  teacher: Teacher;
  mode?: "self" | "admin";
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [photoPreview, setPhotoPreview] = useState(teacher.photoUrl);
  const teacherId = teacher.id;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-xl">
          {mode === "admin" ? "ملف الشيخ" : "ملفي الشخصي"}
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <div className="relative h-36 w-28 overflow-hidden rounded-xl bg-bg-deep">
            <Image
              src={photoPreview}
              alt={teacher.name}
              fill
              unoptimized={photoPreview.includes("blob.vercel-storage.com")}
              className="object-cover object-top"
            />
          </div>
          <form
            className="flex-1 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const file = fd.get("photo");
              if (!(file instanceof File) || file.size === 0) {
                setError("Choose a photo");
                return;
              }
              if (file.size > PHOTO_MAX) {
                setError("Photo max 2MB");
                return;
              }
              setError(null);
              setMsg(null);
              start(async () => {
                try {
                  const pathname = `teachers/${teacherId}/photo-${Date.now()}-${safeFileName(file.name)}`;
                  const blob = await upload(pathname, file, {
                    access: "public",
                    handleUploadUrl: "/api/blob/upload",
                    clientPayload: JSON.stringify({ kind: "photo", teacherId }),
                  });
                  const res = await saveTeacherPhotoUrlAction({
                    url: blob.url,
                    teacherId,
                  });
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setPhotoPreview(blob.url);
                  setMsg("تم تحديث الصورة");
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Photo upload failed. Check Blob config.",
                  );
                }
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
              const res = await updateTeacherProfileAction(fd);
              if (res && "ok" in res && !res.ok) setError(res.error);
              else setMsg("تم حفظ المعلومات");
            });
          }}
        >
          <input type="hidden" name="teacherId" value={teacherId} />
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
          {mode === "admin" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="hidden" name="active" value="false" />
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={teacher.active}
              />
              <span>ظاهر في الموقع (نشط)</span>
            </label>
          )}
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
        teacherId={teacherId}
        kind="video"
        title="فيديوهات البروفايل"
        items={teacher.videos || []}
        accept="video/mp4,video/webm"
        maxBytes={VIDEO_MAX}
        maxLabel="Video max 50MB"
      />
      <MediaSection
        teacherId={teacherId}
        kind="audio"
        title="صوتيات البروفايل"
        items={teacher.audios || []}
        accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a"
        maxBytes={AUDIO_MAX}
        maxLabel="Audio max 15MB"
      />
    </div>
  );
}

function MediaSection({
  teacherId,
  kind,
  title,
  items,
  accept,
  maxBytes,
  maxLabel,
}: {
  teacherId: string;
  kind: "video" | "audio";
  title: string;
  items: { id: string; title: string; url: string }[];
  accept: string;
  maxBytes: number;
  maxLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [list, setList] = useState(items);

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <ul className="mt-3 space-y-2">
        {list.length === 0 && (
          <li className="text-sm text-ink-muted">لا ملفات بعد.</li>
        )}
        {list.map((m) => (
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
                  setList((prev) => prev.filter((x) => x.id !== m.id));
                });
              }}
            >
              <input type="hidden" name="teacherId" value={teacherId} />
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
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const file = fd.get("file");
          const mediaTitle = String(fd.get("title") || "").trim() || "Untitled";
          if (!(file instanceof File) || file.size === 0) {
            setError("Choose a file");
            return;
          }
          if (file.size > maxBytes) {
            setError(maxLabel);
            return;
          }
          setError(null);
          setMsg(null);
          start(async () => {
            try {
              const pathname = `teachers/${teacherId}/${kind}-${Date.now()}-${safeFileName(file.name)}`;
              const blob = await upload(pathname, file, {
                access: "public",
                handleUploadUrl: "/api/blob/upload",
                multipart: file.size > 4 * 1024 * 1024,
                clientPayload: JSON.stringify({
                  kind,
                  title: mediaTitle,
                  teacherId,
                }),
              });
              const res = await saveTeacherMediaUrlAction({
                kind,
                title: mediaTitle,
                url: blob.url,
                teacherId,
              });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setList((prev) => [
                ...prev,
                { id: `local-${Date.now()}`, title: mediaTitle, url: blob.url },
              ]);
              setMsg("تم الرفع");
              form.reset();
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Media upload failed. Check Blob config.",
              );
            }
          });
        }}
      >
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
        {msg && <p className="text-sm text-ok">{msg}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </section>
  );
}

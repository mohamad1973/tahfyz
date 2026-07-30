"use client";

import { useMemo, useState, useTransition } from "react";
import type { AvailabilitySlot } from "@/lib/types";
import { updateTeacherAvailabilityAction } from "@/lib/actions";

const DAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

type Draft = { dayOfWeek: number; startHour: number; endHour: number };

export function AvailabilityEditor({
  teacherId,
  initial,
}: {
  teacherId: string;
  initial: AvailabilitySlot[];
}) {
  const [slots, setSlots] = useState<Draft[]>(
    initial.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startHour: s.startHour,
      endHour: s.endHour,
    })),
  );
  const [day, setDay] = useState(0);
  const [startHour, setStartHour] = useState(17);
  const [endHour, setEndHour] = useState(21);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sorted = useMemo(
    () =>
      [...slots].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour,
      ),
    [slots],
  );

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="font-display text-xl">الجدول الأسبوعي (توقيت القاهرة)</h2>
      <p className="mt-1 text-sm text-ink-muted">
        نوافذ الساعات المتاحة للحجز كل أسبوع.
      </p>

      <ul className="mt-4 space-y-2">
        {sorted.length === 0 && (
          <li className="text-sm text-ink-muted">لا فترات بعد.</li>
        )}
        {sorted.map((s, idx) => (
          <li
            key={`${s.dayOfWeek}-${s.startHour}-${s.endHour}-${idx}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
          >
            <span>
              {DAYS.find((d) => d.value === s.dayOfWeek)?.label} · {s.startHour}
              :00 – {s.endHour}:00
            </span>
            <button
              type="button"
              className="text-xs text-danger"
              onClick={() =>
                setSlots((prev) =>
                  prev.filter(
                    (x) =>
                      !(
                        x.dayOfWeek === s.dayOfWeek &&
                        x.startHour === s.startHour &&
                        x.endHour === s.endHour
                      ),
                  ),
                )
              }
            >
              حذف
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium">اليوم</span>
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">من ساعة</span>
          <input
            type="number"
            min={0}
            max={23}
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">إلى ساعة</span>
          <input
            type="number"
            min={1}
            max={24}
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:bg-bg-deep"
            onClick={() => {
              if (endHour <= startHour) {
                setError("ساعة النهاية لازم أكبر من البداية");
                return;
              }
              setError(null);
              setSlots((prev) => [...prev, { dayOfWeek: day, startHour, endHour }]);
            }}
          >
            إضافة فترة
          </button>
        </div>
      </div>

      <form
        className="mt-4"
        action={() => {
          setError(null);
          setMsg(null);
          start(async () => {
            const fd = new FormData();
            fd.set("teacherId", teacherId);
            fd.set("slotsJson", JSON.stringify(slots));
            const res = await updateTeacherAvailabilityAction(fd);
            if (!res.ok) setError(res.error);
            else setMsg("تم حفظ الجدول");
          });
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card disabled:opacity-60"
        >
          حفظ الجدول
        </button>
      </form>
      {msg && <p className="mt-2 text-sm text-ok">{msg}</p>}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}

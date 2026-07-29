"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarCell, CalendarWeek } from "@/lib/slots";
import { getTeacherCalendarWeek } from "@/lib/actions";
import { cn } from "@/lib/utils";

const statusClass: Record<CalendarCell["status"], string> = {
  closed: "bg-transparent cursor-default",
  past: "bg-bg-deep/40 text-ink-muted/40 cursor-default",
  open: "bg-card border border-olive/40 hover:bg-olive hover:text-card cursor-pointer",
  pending: "bg-sand-soft/80 border border-sand text-ink cursor-default",
  confirmed: "bg-olive-deep text-card cursor-default",
};

export function ScheduleCalendar({
  teacherId,
  selectable = true,
  onSelect,
  compact = false,
  refreshKey = 0,
}: {
  teacherId: string;
  selectable?: boolean;
  onSelect?: (cell: CalendarCell) => void;
  compact?: boolean;
  refreshKey?: number;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [week, setWeek] = useState<CalendarWeek | null>(null);
  const [pending, start] = useTransition();
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/New_York";

  useEffect(() => {
    start(async () => {
      const data = await getTeacherCalendarWeek(teacherId, weekOffset, tz);
      setWeek(data);
    });
  }, [teacherId, weekOffset, tz, refreshKey]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="rounded-lg border border-line p-2 hover:bg-bg-deep"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center text-sm">
          <div className="font-semibold text-ink">
            {pending ? "Loading…" : "Week schedule (Egypt time)"}
          </div>
          <p className="text-xs text-ink-muted">Shown also in {tz}</p>
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="rounded-lg border border-line p-2 hover:bg-bg-deep"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        <Legend swatch="border border-olive/40 bg-card" label="Open" />
        <Legend swatch="bg-sand-soft" label="Pending pay" />
        <Legend swatch="bg-olive-deep" label="Booked" />
      </div>

      {week && (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] border-collapse text-center text-xs">
            <thead>
              <tr className="bg-bg-deep/70">
                <th className="sticky left-0 bg-bg-deep/70 px-1 py-2 font-semibold">
                  Hour
                </th>
                {week.days.map((d) => (
                  <th key={d.dateKey} className="px-1 py-2 font-semibold">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {week.hours.map((hour, hi) => (
                <tr key={hour} className="border-t border-line/60">
                  <td className="sticky left-0 bg-card px-1 py-1 font-medium text-ink-muted">
                    {String(hour).padStart(2, "0")}:00
                  </td>
                  {week.cells[hi].map((cell) => {
                    const canClick =
                      selectable && cell.status === "open" && !!onSelect;
                    return (
                      <td key={`${hour}-${cell.dayIndex}`} className="p-0.5">
                        <button
                          type="button"
                          disabled={!canClick}
                          title={
                            cell.status === "open"
                              ? cell.labelLocal
                              : cell.status
                          }
                          onClick={() => canClick && onSelect?.(cell)}
                          className={cn(
                            "flex h-9 w-full items-center justify-center rounded-md transition",
                            compact ? "h-7" : "h-9",
                            statusClass[cell.status],
                          )}
                        >
                          {cell.status === "open"
                            ? "•"
                            : cell.status === "pending"
                              ? "…"
                              : cell.status === "confirmed"
                                ? "✓"
                                : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm", swatch)} />
      {label}
    </span>
  );
}

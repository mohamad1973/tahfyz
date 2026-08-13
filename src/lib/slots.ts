import {
  addDays,
  getDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfWeek,
  isBefore,
  isAfter,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { AvailabilitySlot, Booking } from "./types";
import { EGYPT_TZ } from "./utils";

export type OpenSlot = {
  start: string;
  end: string;
  labelLocal: string;
  labelEgypt: string;
};

export type CellStatus = "closed" | "open" | "pending" | "confirmed" | "past";

export type CalendarCell = {
  start: string;
  end: string;
  hour: number;
  dayIndex: number;
  status: CellStatus;
  labelLocal: string;
};

export type CalendarWeek = {
  weekStart: string;
  days: { dateKey: string; label: string; dow: number }[];
  hours: number[];
  cells: CalendarCell[][]; // [hourIndex][dayIndex]
};

function blockingStatuses(status: Booking["status"]) {
  return status === "pending_payment" || status === "confirmed";
}

function formatInTz(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function findBooking(
  bookings: Booking[],
  startUtc: Date,
  endUtc: Date,
  now: Date,
): Booking | undefined {
  return bookings.find((b) => {
    if (!blockingStatuses(b.status)) return false;
    if (b.status === "pending_payment" && new Date(b.holdExpiresAt) < now)
      return false;
    const bs = new Date(b.slotStart);
    const be = new Date(b.slotEnd);
    return isBefore(startUtc, be) && isAfter(endUtc, bs);
  });
}

/** Build open 1-hour slots for the next `days` days in Egypt time */
export function buildOpenSlots(opts: {
  availability: AvailabilitySlot[];
  bookings: Booking[];
  days?: number;
  viewerTz?: string;
}): OpenSlot[] {
  const days = opts.days ?? 28;
  const viewerTz =
    opts.viewerTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const result: OpenSlot[] = [];

  for (let d = 0; d < days; d++) {
    const egyptDay = toZonedTime(addDays(now, d), EGYPT_TZ);
    const dow = getDay(egyptDay);
    const windows = opts.availability.filter((a) => a.dayOfWeek === dow);
    for (const w of windows) {
      for (let h = w.startHour; h < w.endHour; h++) {
        const local = setMilliseconds(
          setSeconds(setMinutes(setHours(egyptDay, h), 0), 0),
          0,
        );
        const startUtc = fromZonedTime(local, EGYPT_TZ);
        const endUtc = fromZonedTime(setHours(local, h + 1), EGYPT_TZ);
        if (!isAfter(endUtc, now)) continue;
        if (findBooking(opts.bookings, startUtc, endUtc, now)) continue;
        result.push({
          start: startUtc.toISOString(),
          end: endUtc.toISOString(),
          labelLocal: formatInTz(startUtc, viewerTz),
          labelEgypt: formatInTz(startUtc, EGYPT_TZ) + " (Egypt)",
        });
      }
    }
  }
  return result;
}

/** Week grid: Sun–Sat columns, hour rows, with cell status */
export function buildCalendarWeek(opts: {
  availability: AvailabilitySlot[];
  bookings: Booking[];
  weekOffset?: number;
  viewerTz?: string;
  hourStart?: number;
  hourEnd?: number;
}): CalendarWeek {
  const viewerTz =
    opts.viewerTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hourStart = opts.hourStart ?? 0;
  const hourEnd = opts.hourEnd ?? 24;
  const now = new Date();
  const egyptNow = toZonedTime(now, EGYPT_TZ);
  const weekStartLocal = startOfWeek(
    addDays(egyptNow, (opts.weekOffset ?? 0) * 7),
    { weekStartsOn: 0 },
  );

  const hours: number[] = [];
  for (let h = hourStart; h < hourEnd; h++) hours.push(h);

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStartLocal, i);
    const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: EGYPT_TZ,
    }).format(fromZonedTime(day, EGYPT_TZ));
    return { dateKey, label, dow: getDay(day) };
  });

  const cells: CalendarCell[][] = hours.map((hour) =>
    days.map((day, dayIndex) => {
      const base = addDays(weekStartLocal, dayIndex);
      const local = setMilliseconds(
        setSeconds(setMinutes(setHours(base, hour), 0), 0),
        0,
      );
      const startUtc = fromZonedTime(local, EGYPT_TZ);
      const endUtc = fromZonedTime(setHours(local, hour + 1), EGYPT_TZ);

      const windows = opts.availability.filter((a) => a.dayOfWeek === day.dow);
      const inWindow = windows.some(
        (w) => hour >= w.startHour && hour < w.endHour,
      );

      let status: CellStatus = "closed";
      if (!inWindow) {
        status = "closed";
      } else if (!isAfter(endUtc, now)) {
        status = "past";
      } else {
        const booking = findBooking(opts.bookings, startUtc, endUtc, now);
        if (!booking) status = "open";
        else if (booking.status === "confirmed") status = "confirmed";
        else status = "pending";
      }

      return {
        start: startUtc.toISOString(),
        end: endUtc.toISOString(),
        hour,
        dayIndex,
        status,
        labelLocal: formatInTz(startUtc, viewerTz),
      };
    }),
  );

  return {
    weekStart: fromZonedTime(weekStartLocal, EGYPT_TZ).toISOString(),
    days,
    hours,
    cells,
  };
}

export function formatSlotRange(startIso: string, endIso: string, tz?: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return `${new Intl.DateTimeFormat("en-US", opts).format(start)} – ${new Intl.DateTimeFormat(
    "en-US",
    { timeZone: tz, hour: "numeric", minute: "2-digit" },
  ).format(end)}`;
}

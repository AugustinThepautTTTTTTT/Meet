import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";
import { ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

function icsDate(value: string) {
  const m = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/);
  return m
    ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
    : null;
}

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function zonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  let date = new Date(Date.UTC(year, month, day, hour, minute));
  for (let pass = 0; pass < 2; pass++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const shown = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    const wanted = Date.UTC(year, month, day, hour, minute);
    date = new Date(date.getTime() + wanted - shown);
  }
  return date;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  await ensureLawyerWorkflowSchema();
  const sql = getLawyerDb();
  const [row] =
    await sql`SELECT l.availability,c.* FROM lawyers l LEFT JOIN calendar_settings c ON c.lawyer_id=l.id WHERE l.slug=${slug} AND l.published=true`;
  if (!row)
    return NextResponse.json({ error: "Lawyer not found" }, { status: 404 });
  if (!row.enabled)
    return NextResponse.json({
      slots: [row.availability, "Next weekday · 14:00", "Next weekday · 17:30"],
      days: [],
      connected: false,
    });
  const busy: Array<[Date, Date]> = [];
  if (row.ical_url)
    try {
      const text = await fetch(row.ical_url, {
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      }).then((r) => r.text());
      for (const event of text.split("BEGIN:VEVENT").slice(1)) {
        const start = icsDate(
          event.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1] || "",
        );
        const end = icsDate(event.match(/DTEND[^:]*:([^\r\n]+)/)?.[1] || "");
        if (start && end) busy.push([start, end]);
      }
    } catch {
      /* calendar remains usable from open hours */
    }
  const slots: string[] = [];
  const days: Array<{
    date: string;
    weekday: string;
    dayLabel: string;
    slots: Array<{ start: string; label: string }>;
  }> = [];
  const now = new Date();
  const hours = row.weekly_hours || {};
  for (let d = 1; d <= row.booking_days_ahead && days.length < 14; d++) {
    const day = new Date(now);
    day.setUTCDate(now.getUTCDate() + d);
    const rule = hours[dayNames[day.getUTCDay()]];
    const daySlots: Array<{ start: string; label: string }> = [];
    const dateKey = day.toISOString().slice(0, 10);
    if (!rule) {
      days.push({
        date: dateKey,
        weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(
          day,
        ),
        dayLabel: new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
        }).format(day),
        slots: [],
      });
      continue;
    }
    const [sh, sm] = rule[0].split(":").map(Number),
      [eh, em] = rule[1].split(":").map(Number);
    for (
      let mins = sh * 60 + sm;
      mins + row.duration_minutes <= eh * 60 + em;
      mins += row.duration_minutes + row.buffer_minutes
    ) {
      const start = zonedDate(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        Math.floor(mins / 60),
        mins % 60,
        row.timezone,
      );
      const end = new Date(start.getTime() + row.duration_minutes * 60000);
      if (busy.some(([a, b]) => start < b && end > a)) continue;
      const label = new Intl.DateTimeFormat("en", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: row.timezone,
      }).format(start);
      daySlots.push({ start: start.toISOString(), label });
      slots.push(
        new Intl.DateTimeFormat("en", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: row.timezone,
        }).format(start),
      );
    }
    days.push({
      date: dateKey,
      weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(day),
      dayLabel: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
      }).format(day),
      slots: daySlots,
    });
  }
  return NextResponse.json({
    slots: slots.slice(0, 40),
    days,
    timezone: row.timezone,
    durationMinutes: row.duration_minutes,
    connected: true,
  });
}

import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";
import { ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

function parseIcsDate(value: string) {
  const match = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/);
  return match
    ? new Date(
        `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`,
      )
    : null;
}

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLawyerWorkflowSchema();
  const sql = getLawyerDb();
  const [settings] = await sql`
    SELECT c.* FROM calendar_settings c
    JOIN lawyers l ON l.id=c.lawyer_id
    WHERE l.account_id=${accountId}
  `;
  const events: Array<{ start: string; end: string; type: "busy" }> = [];
  let sync: {
    ok: boolean;
    message: string;
    checkedAt: string;
  } = {
    ok: false,
    message: settings?.ical_url
      ? "Calendar has not been checked yet."
      : "No calendar feed is connected.",
    checkedAt: new Date().toISOString(),
  };
  if (settings?.enabled && settings.ical_url) {
    try {
      const response = await fetch(settings.ical_url, {
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok)
        throw new Error(`Calendar provider returned ${response.status}`);
      const text = await response.text();
      if (!/BEGIN:VCALENDAR/i.test(text) || /text\/html/i.test(contentType))
        throw new Error("The address is not an iCalendar feed");
      for (const event of text.split("BEGIN:VEVENT").slice(1)) {
        const start = parseIcsDate(
          event.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1] || "",
        );
        const end = parseIcsDate(
          event.match(/DTEND[^:]*:([^\r\n]+)/)?.[1] || "",
        );
        if (start && end)
          events.push({
            start: start.toISOString(),
            end: end.toISOString(),
            type: "busy",
          });
      }
      sync = {
        ok: true,
        message: `Calendar connected · ${events.length} events received`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      sync = {
        ok: false,
        message:
          error instanceof Error
            ? `${error.message}. Paste Google's “Secret address in iCal format”.`
            : "Calendar could not be refreshed.",
        checkedAt: new Date().toISOString(),
      };
    }
  }
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date();
  windowEnd.setDate(
    windowEnd.getDate() + Math.max(60, settings?.booking_days_ahead || 14),
  );
  const relevantEvents = events
    .filter((event) => {
      const end = new Date(event.end);
      const start = new Date(event.start);
      return end >= windowStart && start <= windowEnd;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  return NextResponse.json({ events: relevantEvents.slice(0, 500), sync });
}

export async function PUT(request: Request) {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  await ensureLawyerWorkflowSchema();
  const sql = getLawyerDb();
  const [lawyer] =
    await sql`SELECT id FROM lawyers WHERE account_id=${accountId}`;
  if (!lawyer)
    return NextResponse.json(
      { error: "Save your profile first." },
      { status: 400 },
    );
  const url = String(body.ical_url || "").trim();
  if (body.enabled && url && !/^https:\/\//i.test(url))
    return NextResponse.json(
      { error: "Use a secure HTTPS calendar feed URL." },
      { status: 400 },
    );
  const hours = typeof body.weekly_hours === "object" ? body.weekly_hours : {};
  const [settings] = await sql`
    INSERT INTO calendar_settings (lawyer_id,provider,ical_url,timezone,duration_minutes,buffer_minutes,booking_days_ahead,weekly_hours,enabled)
    VALUES (${lawyer.id},${String(body.provider || "ical")},${url},${String(body.timezone || "Europe/Paris")},${Math.max(15, Math.min(120, Number(body.duration_minutes) || 30))},${Math.max(0, Math.min(60, Number(body.buffer_minutes) || 0))},${Math.max(3, Math.min(60, Number(body.booking_days_ahead) || 14))},${JSON.stringify(hours)}::jsonb,${Boolean(body.enabled)})
    ON CONFLICT (lawyer_id) DO UPDATE SET provider=EXCLUDED.provider,ical_url=EXCLUDED.ical_url,timezone=EXCLUDED.timezone,duration_minutes=EXCLUDED.duration_minutes,buffer_minutes=EXCLUDED.buffer_minutes,booking_days_ahead=EXCLUDED.booking_days_ahead,weekly_hours=EXCLUDED.weekly_hours,enabled=EXCLUDED.enabled,updated_at=now()
    RETURNING provider,timezone,duration_minutes,buffer_minutes,booking_days_ahead,weekly_hours,enabled,(ical_url<>'') AS connected
  `;
  return NextResponse.json({ settings });
}

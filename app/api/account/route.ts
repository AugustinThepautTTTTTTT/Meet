import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";
import { ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getLawyerDb();
  await ensureLawyerWorkflowSchema();
  const [account] =
    await sql`SELECT id,name,email,created_at FROM lawyer_accounts WHERE id=${accountId}`;
  const [profile] =
    await sql`SELECT * FROM lawyers WHERE account_id=${accountId}`;
  const articles = profile
    ? await sql`SELECT id,slug,title,excerpt,body,cover_image_url,cover_settings,content,theme,author_note,published,created_at,updated_at FROM posts WHERE lawyer_id=${profile.id} ORDER BY updated_at DESC`
    : [];
  const inquiries = profile
    ? await sql`SELECT id, client_name, client_email, brief, meeting_time, meeting_start, meeting_uid, invite_sent_at, status, lawyer_note, created_at, updated_at FROM inquiries WHERE lawyer_id=${profile.id} AND status<>'payment_pending' ORDER BY created_at DESC`
    : [];
  const [calendar] = profile
    ? await sql`SELECT provider,ical_url,timezone,duration_minutes,buffer_minutes,booking_days_ahead,weekly_hours,enabled FROM calendar_settings WHERE lawyer_id=${profile.id}`
    : [];
  return NextResponse.json({
    account,
    profile: profile || null,
    articles,
    inquiries,
    calendar: calendar || null,
  });
}

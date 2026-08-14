import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getClientDb, getLawyerDb } from "@/lib/database";
import {
  ensureClientWorkflowSchema,
  ensureLawyerWorkflowSchema,
} from "@/lib/workflow-schema";
import { sendMeetingInvite } from "@/lib/meeting-invite";
import { recordMatterEvent } from "@/lib/matter";

const allowedStatuses = new Set([
  "accepted",
  "declined",
  "clarification_requested",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status, note } = await request.json();
  if (!allowedStatuses.has(status))
    return NextResponse.json({ error: "Invalid response." }, { status: 400 });
  await ensureLawyerWorkflowSchema();
  const sql = getLawyerDb();
  const [updated] = await sql`
    UPDATE inquiries i SET status=${status}, lawyer_note=${String(note || "").trim()}, updated_at=now()
    FROM lawyers l
    WHERE i.id=${id} AND i.lawyer_id=l.id AND l.account_id=${accountId}
      AND i.status<>'payment_pending'
    RETURNING i.*
  `;
  if (!updated)
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  await recordMatterEvent(
    updated.id,
    "lawyer",
    "Lawyer",
    "status",
    status === "accepted"
      ? "Accepted the consultation request"
      : status === "declined"
        ? "Declined the consultation request"
        : "Requested clarification from the client",
  );
  let invitation: { sent: boolean; reason?: string } | null = null;
  if (status === "accepted" && updated.meeting_start) {
    const [organizer] = await sql`
      SELECT a.email, l.name, COALESCE(c.duration_minutes, 30) AS duration_minutes
      FROM lawyers l
      JOIN lawyer_accounts a ON a.id=l.account_id
      LEFT JOIN calendar_settings c ON c.lawyer_id=l.id
      WHERE l.id=${updated.lawyer_id}
    `;
    if (organizer) {
      const result = await sendMeetingInvite({
        uid: updated.meeting_uid || undefined,
        start: new Date(updated.meeting_start),
        durationMinutes: organizer.duration_minutes,
        lawyerName: organizer.name,
        lawyerEmail: organizer.email,
        clientName: updated.client_name,
        clientEmail: updated.client_email,
        brief: updated.brief,
      });
      const [withInvite] = await sql`
        UPDATE inquiries SET meeting_uid=${result.uid}, invite_sent_at=${result.sent ? new Date() : null}
        WHERE id=${updated.id} RETURNING *
      `;
      Object.assign(updated, withInvite);
      invitation = { sent: result.sent, reason: result.reason };
    }
  }
  if (status === "accepted") {
    await ensureClientWorkflowSchema();
    const clients = getClientDb();
    await clients`
      UPDATE cases SET status='confirmed', meeting_start=${updated.meeting_start || null},
        updated_at=now()
      WHERE id=${updated.external_case_id}
    `;
  }
  let fallback: { lawyerName: string } | null = null;
  if (status === "declined") {
    const [nextLawyer] = await sql`
      SELECT id, slug, name FROM lawyers
      WHERE published=true AND account_id IS NOT NULL AND id<>${updated.lawyer_id}
        AND lower(practice)=lower(${updated.brief.practice || ""})
      ORDER BY featured_rank ASC, created_at ASC LIMIT 1
    `;
    if (nextLawyer) {
      await sql`
        INSERT INTO inquiries (external_case_id, lawyer_id, client_name, client_email, brief, meeting_time, lawyer_note)
        VALUES (${updated.external_case_id}, ${nextLawyer.id}, ${updated.client_name}, ${updated.client_email}, ${JSON.stringify(updated.brief)}::jsonb, ${updated.meeting_time}, 'Automatically rerouted after the previous lawyer was unavailable.')
        ON CONFLICT (external_case_id, lawyer_id) DO UPDATE SET status='pending', updated_at=now()
      `;
      await ensureClientWorkflowSchema();
      const clients = getClientDb();
      await clients`
        UPDATE cases SET selected_lawyer_slug=${nextLawyer.slug}, selected_lawyer_name=${nextLawyer.name},
          status='automatically_rematched', updated_at=now()
        WHERE id=${updated.external_case_id}
      `;
      fallback = { lawyerName: nextLawyer.name };
    }
  }
  return NextResponse.json({ inquiry: updated, fallback, invitation });
}

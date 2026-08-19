import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";
import { authorizeMatter } from "@/lib/matter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await authorizeMatter(id);
  if (!actor)
    return NextResponse.json({ error: "Matter not found." }, { status: 404 });

  const sql = getLawyerDb();
  const [messages, files, tasks, events] = await Promise.all([
    sql`SELECT id,author_role,author_name,body,created_at FROM matter_messages WHERE inquiry_id=${id} ORDER BY created_at ASC`,
    sql`SELECT id,uploader_role,uploader_name,filename,mime_type,size_bytes,created_at FROM matter_files WHERE inquiry_id=${id} ORDER BY created_at DESC`,
    sql`SELECT id,title,assigned_to,status,due_date,created_by,created_at,completed_at FROM matter_tasks WHERE inquiry_id=${id} ORDER BY (status='done') ASC,due_date ASC NULLS LAST,created_at DESC`,
    sql`SELECT id,actor_role,actor_name,event_type,description,created_at FROM matter_events WHERE inquiry_id=${id} ORDER BY created_at DESC LIMIT 30`,
  ]);
  return NextResponse.json({
    actor: { role: actor.role, name: actor.name },
    matter: {
      id,
      status: actor.inquiry.status,
      lawyerName: actor.inquiry.lawyer_name,
      lawyerSlug: actor.inquiry.lawyer_slug,
      clientName: actor.inquiry.client_name,
      meetingTime: actor.inquiry.meeting_time,
      meetingStart: actor.inquiry.meeting_start,
      meetingUrl: "clientCase" in actor ? actor.clientCase?.meeting_url || "" : "",
      paymentStatus: actor.inquiry.payment_status,
      paymentAmountCents: actor.inquiry.payment_amount_cents,
      paymentCurrency: actor.inquiry.payment_currency,
      checkoutUrl: "clientCase" in actor ? actor.clientCase?.stripe_checkout_url || "" : "",
      lawyerNote: actor.inquiry.lawyer_note,
      brief: actor.inquiry.brief,
    },
    messages,
    files,
    tasks,
    events,
  });
}

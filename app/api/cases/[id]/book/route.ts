import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClientSession } from "@/lib/auth";
import { getClientDb, getLawyerDb } from "@/lib/database";
import {
  ensureClientWorkflowSchema,
  ensureLawyerWorkflowSchema,
} from "@/lib/workflow-schema";
import { sendRequestReceived } from "@/lib/meeting-invite";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rate = checkRateLimit(`booking:${requestIp(request)}`, 10, 60 * 60_000);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
      );
    const { id } = await params;
    const {
      lawyerSlug,
      clientName,
      clientEmail,
      clientPassword,
      meetingTime,
      meetingStart,
      bookingAuthMode,
    } = await request.json();
    const cleanEmail = String(clientEmail || "")
      .trim()
      .toLowerCase();
    if (
      !lawyerSlug ||
      (bookingAuthMode !== "signin" && !String(clientName || "").trim()) ||
      !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
      String(clientPassword || "").length < 8 ||
      !meetingTime
    )
      return NextResponse.json(
        {
          error:
            "Choose a time and add your name, email and an 8-character password.",
        },
        { status: 400 },
      );

    await Promise.all([
      ensureClientWorkflowSchema(),
      ensureLawyerWorkflowSchema(),
    ]);
    const clients = getClientDb();
    const lawyers = getLawyerDb();
    const [[caseRecord], [lawyer]] = await Promise.all([
      clients`SELECT id, brief FROM cases WHERE id=${id}`,
      lawyers`SELECT id, name, first_consultation_price_cents, consultation_currency,
        first_consultation_free FROM lawyers WHERE slug=${lawyerSlug} AND published=true`,
    ]);
    if (!caseRecord || !lawyer)
      return NextResponse.json(
        { error: "This case or lawyer is no longer available." },
        { status: 404 },
      );

    const paymentRequired = !lawyer.first_consultation_free;
    const amountCents = Number(lawyer.first_consultation_price_cents || 0);
    const currency = String(lawyer.consultation_currency || "EUR").toUpperCase();
    if (paymentRequired && (!Number.isInteger(amountCents) || amountCents <= 0))
      return NextResponse.json(
        { error: "This lawyer has not configured a valid consultation price." },
        { status: 409 },
      );
    const [existingClient] =
      await clients`SELECT id, name, password_hash FROM client_accounts WHERE email=${cleanEmail}`;
    let clientAccountId: string;
    let accountCreated = false;
    let effectiveClientName = String(clientName || "").trim();
    if (existingClient) {
      const valid = await bcrypt.compare(
        String(clientPassword),
        existingClient.password_hash,
      );
      if (!valid)
        return NextResponse.json(
          {
            error:
              "An account already uses this email. Enter its password to continue.",
          },
          { status: 409 },
        );
      clientAccountId = existingClient.id;
      effectiveClientName = existingClient.name;
    } else {
      if (bookingAuthMode === "signin")
        return NextResponse.json(
          {
            error: "No client account uses this email. Choose Create account.",
          },
          { status: 404 },
        );
      const passwordHash = await bcrypt.hash(String(clientPassword), 12);
      const [createdClient] = await clients`
        INSERT INTO client_accounts (name, email, password_hash)
        VALUES (${String(clientName).trim()}, ${cleanEmail}, ${passwordHash})
        RETURNING id
      `;
      clientAccountId = createdClient.id;
      accountCreated = true;
    }

    const [inquiry] = await lawyers`
      INSERT INTO inquiries (external_case_id, lawyer_id, client_name, client_email, brief, meeting_time, meeting_start,
        status, payment_status, payment_amount_cents, payment_currency)
      VALUES (${id}, ${lawyer.id}, ${effectiveClientName}, ${cleanEmail}, ${JSON.stringify(caseRecord.brief)}::jsonb,
        ${meetingTime}, ${meetingStart ? new Date(meetingStart) : null}, 'pending',
        ${paymentRequired ? "unpaid" : "not_required"}, ${paymentRequired ? amountCents : null}, ${currency})
      ON CONFLICT (external_case_id, lawyer_id) DO UPDATE SET
        client_name=EXCLUDED.client_name, client_email=EXCLUDED.client_email,
        brief=EXCLUDED.brief, meeting_time=EXCLUDED.meeting_time, meeting_start=EXCLUDED.meeting_start,
        status='pending', payment_status=${paymentRequired ? "unpaid" : "not_required"},
        payment_amount_cents=${paymentRequired ? amountCents : null}, payment_currency=${currency}, updated_at=now()
      RETURNING id
    `;
    const intakeDocuments = await clients`
      SELECT id,filename,blob_url,mime_type,size_bytes
      FROM intake_documents WHERE case_id=${id} ORDER BY created_at
    `;
    for (const document of intakeDocuments) {
      await lawyers`
        INSERT INTO matter_files
          (inquiry_id,uploader_role,uploader_name,filename,blob_url,mime_type,size_bytes,source_document_id)
        VALUES (${inquiry.id},'client',${effectiveClientName},${document.filename},${document.blob_url},${document.mime_type},${document.size_bytes},${document.id})
        ON CONFLICT (source_document_id) DO UPDATE SET inquiry_id=EXCLUDED.inquiry_id,
          uploader_name=EXCLUDED.uploader_name
      `;
    }
    if (intakeDocuments.length)
      await lawyers`
        INSERT INTO matter_events (inquiry_id,actor_role,actor_name,event_type,description)
        SELECT ${inquiry.id},'system','Meet','file',${`${intakeDocuments.length} intake document${intakeDocuments.length === 1 ? "" : "s"} attached to the matter`}
        WHERE NOT EXISTS (
          SELECT 1 FROM matter_events WHERE inquiry_id=${inquiry.id} AND event_type='file'
            AND description LIKE '%intake document%'
        )
      `;
    await lawyers`
      INSERT INTO matter_events (inquiry_id,actor_role,actor_name,event_type,description)
      SELECT ${inquiry.id},'system','Meet','request','Request sent to the lawyer for review'
      WHERE NOT EXISTS (
        SELECT 1 FROM matter_events WHERE inquiry_id=${inquiry.id} AND event_type='request'
      )
    `;
    await clients`
      UPDATE cases SET client_account_id=${clientAccountId}, client_name=${effectiveClientName}, client_email=${cleanEmail},
        selected_lawyer_slug=${lawyerSlug}, selected_lawyer_name=${lawyer.name},
        meeting_time=${meetingTime}, meeting_start=${meetingStart ? new Date(meetingStart) : null},
        status='meeting_requested',
        payment_status=${paymentRequired ? "unpaid" : "not_required"},
        payment_amount_cents=${paymentRequired ? amountCents : null}, payment_currency=${currency}, updated_at=now()
      WHERE id=${id}
    `;
    await createClientSession(clientAccountId);
    const email = await sendRequestReceived({
      clientName: effectiveClientName,
      clientEmail: cleanEmail,
      lawyerName: lawyer.name,
      meetingTime,
      brief: caseRecord.brief,
    });
    return NextResponse.json({
      booking: {
        lawyerName: lawyer.name,
        meetingTime,
        status: "pending",
      },
      accountCreated,
      email,
      paymentRequired,
    });
  } catch (error) {
    console.error("case_booking_failed", error);
    return NextResponse.json(
      { error: "We could not request this meeting. Please try again." },
      { status: 500 },
    );
  }
}

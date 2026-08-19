import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getClientDb, getLawyerDb } from "@/lib/database";
import {
  ensureClientWorkflowSchema,
  ensureLawyerWorkflowSchema,
} from "@/lib/workflow-schema";
import { sendMeetingInvite, sendPaymentRequired } from "@/lib/meeting-invite";
import { recordMatterEvent } from "@/lib/matter";
import { getStripe } from "@/lib/stripe";

const allowedStatuses = new Set([
  "accepted",
  "declined",
  "clarification_requested",
  "completed",
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
  const lawyerNote = String(note || "").trim();
  if (!allowedStatuses.has(status))
    return NextResponse.json({ error: "Invalid response." }, { status: 400 });

  await Promise.all([ensureClientWorkflowSchema(), ensureLawyerWorkflowSchema()]);
  const lawyers = getLawyerDb();
  const clients = getClientDb();
  const [inquiry] = await lawyers`
    SELECT i.*, l.account_id AS lawyer_account_id, l.name AS lawyer_name,
      l.slug AS lawyer_slug, a.email AS lawyer_email,
      COALESCE(c.duration_minutes, 30) AS duration_minutes
    FROM inquiries i
    JOIN lawyers l ON l.id=i.lawyer_id
    JOIN lawyer_accounts a ON a.id=l.account_id
    LEFT JOIN calendar_settings c ON c.lawyer_id=l.id
    WHERE i.id=${id} AND l.account_id=${accountId}
  `;
  if (!inquiry)
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });

  if (status === "accepted") {
    if (!["pending", "clarification_requested"].includes(inquiry.status))
      return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });

    const paymentRequired =
      inquiry.payment_status === "unpaid" &&
      Number(inquiry.payment_amount_cents || 0) > 0;

    if (paymentRequired) {
      if (!process.env.STRIPE_SECRET_KEY)
        return NextResponse.json({ error: "Stripe payment is not configured." }, { status: 503 });
      const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      const session = await getStripe().checkout.sessions.create({
        integration_identifier: "meet_approval_kqmxpvra",
        mode: "payment",
        customer_email: inquiry.client_email,
        client_reference_id: String(inquiry.external_case_id),
        line_items: [{
          quantity: 1,
          price_data: {
            currency: String(inquiry.payment_currency || "EUR").toLowerCase(),
            unit_amount: Number(inquiry.payment_amount_cents),
            product_data: {
              name: `First legal consultation with ${inquiry.lawyer_name}`,
              description: `${inquiry.meeting_time} · validé via Repere`,
            },
          },
        }],
        metadata: {
          caseId: String(inquiry.external_case_id),
          lawyerId: String(inquiry.lawyer_id),
          inquiryId: String(inquiry.id),
          lawyerSlug: String(inquiry.lawyer_slug),
        },
        success_url: `${origin}/matters/${inquiry.id}?payment=success`,
        cancel_url: `${origin}/matters/${inquiry.id}?payment=cancelled`,
      });
      const [[updated]] = await Promise.all([
        lawyers`
          UPDATE inquiries SET status='payment_pending', lawyer_note=${lawyerNote},
            stripe_checkout_session_id=${session.id}, updated_at=now()
          WHERE id=${id} RETURNING *
        `,
        clients`
          UPDATE cases SET status='payment_pending', stripe_checkout_session_id=${session.id},
            stripe_checkout_url=${session.url || ""}, updated_at=now()
          WHERE id=${inquiry.external_case_id}
        `,
      ]);
      await recordMatterEvent(id, "lawyer", inquiry.lawyer_name, "approval", "Approved the request — client payment is now required");
      const email = session.url
        ? await sendPaymentRequired({
            clientName: inquiry.client_name,
            clientEmail: inquiry.client_email,
            lawyerName: inquiry.lawyer_name,
            meetingTime: inquiry.meeting_time,
            amount: Number(inquiry.payment_amount_cents),
            currency: String(inquiry.payment_currency || "EUR"),
            checkoutUrl: session.url,
          })
        : { sent: false, reason: "Stripe did not return a checkout URL." };
      return NextResponse.json({ inquiry: updated, paymentRequired: true, email });
    }

    const invitation = inquiry.meeting_start
      ? await sendMeetingInvite({
          uid: inquiry.meeting_uid || undefined,
          start: new Date(inquiry.meeting_start),
          durationMinutes: Number(inquiry.duration_minutes || 30),
          lawyerName: inquiry.lawyer_name,
          lawyerEmail: inquiry.lawyer_email,
          clientName: inquiry.client_name,
          clientEmail: inquiry.client_email,
          brief: inquiry.brief,
        })
      : null;
    const [updated] = await lawyers`
      UPDATE inquiries SET status='confirmed', lawyer_note=${lawyerNote},
        meeting_uid=${invitation?.uid || inquiry.meeting_uid || ""},
        invite_sent_at=${invitation?.sent ? new Date() : null}, updated_at=now()
      WHERE id=${id} RETURNING *
    `;
    await clients`
      UPDATE cases SET status='confirmed', payment_status=${inquiry.payment_status},
        updated_at=now() WHERE id=${inquiry.external_case_id}
    `;
    await recordMatterEvent(id, "lawyer", inquiry.lawyer_name, "confirmation", "Approved and confirmed the consultation");
    return NextResponse.json({ inquiry: updated, paymentRequired: false, invitation });
  }

  if (status === "clarification_requested") {
    if (!lawyerNote)
      return NextResponse.json({ error: "Add the question you want the client to answer." }, { status: 400 });
    const [updated] = await lawyers`
      UPDATE inquiries SET status='clarification_requested', lawyer_note=${lawyerNote}, updated_at=now()
      WHERE id=${id} AND status IN ('pending','clarification_requested') RETURNING *
    `;
    if (!updated)
      return NextResponse.json({ error: "This request can no longer be changed." }, { status: 409 });
    await Promise.all([
      clients`UPDATE cases SET status='clarification_requested', updated_at=now() WHERE id=${inquiry.external_case_id}`,
      lawyers`INSERT INTO matter_messages (inquiry_id,author_role,author_name,body)
        VALUES (${id},'lawyer',${inquiry.lawyer_name},${lawyerNote})`,
      recordMatterEvent(id, "lawyer", inquiry.lawyer_name, "question", "Requested additional information from the client"),
    ]);
    return NextResponse.json({ inquiry: updated });
  }

  if (status === "completed") {
    const [updated] = await lawyers`
      UPDATE inquiries SET status='completed', lawyer_note=${lawyerNote || inquiry.lawyer_note}, updated_at=now()
      WHERE id=${id} AND status='confirmed' RETURNING *
    `;
    if (!updated)
      return NextResponse.json({ error: "Only a confirmed consultation can be marked completed." }, { status: 409 });
    await clients`UPDATE cases SET status='completed', updated_at=now() WHERE id=${inquiry.external_case_id}`;
    await recordMatterEvent(id, "lawyer", inquiry.lawyer_name, "completed", "Marked the consultation as completed");
    return NextResponse.json({ inquiry: updated });
  }

  const [updated] = await lawyers`
    UPDATE inquiries SET status='declined', lawyer_note=${lawyerNote}, updated_at=now()
    WHERE id=${id} AND status IN ('pending','clarification_requested') RETURNING *
  `;
  if (!updated)
    return NextResponse.json({ error: "This request can no longer be declined." }, { status: 409 });
  await clients`UPDATE cases SET status='declined', updated_at=now() WHERE id=${inquiry.external_case_id}`;
  await recordMatterEvent(id, "lawyer", inquiry.lawyer_name, "declined", "Declined the consultation request");
  return NextResponse.json({ inquiry: updated });
}

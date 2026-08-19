import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getClientDb, getLawyerDb } from "@/lib/database";
import { sendMeetingInvite } from "@/lib/meeting-invite";
import { getStripe } from "@/lib/stripe";
import { recordMatterEvent } from "@/lib/matter";
import {
  ensureClientWorkflowSchema,
  ensureLawyerWorkflowSchema,
} from "@/lib/workflow-schema";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret)
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("stripe_webhook_signature_failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid")
      return NextResponse.json({ received: true });

    const caseId = session.metadata?.caseId;
    const lawyerId = session.metadata?.lawyerId;
    if (!caseId || !lawyerId)
      return NextResponse.json({ error: "Missing payment metadata." }, { status: 400 });

    await Promise.all([
      ensureClientWorkflowSchema(),
      ensureLawyerWorkflowSchema(),
    ]);
    const clients = getClientDb();
    const lawyers = getLawyerDb();
    const [paidCase] = await clients`
      UPDATE cases SET payment_status='paid', status='confirmed',
        stripe_payment_intent_id=${String(session.payment_intent || '')},
        stripe_checkout_url='', updated_at=now()
      WHERE id=${caseId} AND stripe_checkout_session_id=${session.id}
        AND payment_status<>'paid'
      RETURNING client_name, client_email, selected_lawyer_name, meeting_time,
        meeting_start, brief
    `;
    const [paidInquiry] = await lawyers`
      UPDATE inquiries SET payment_status='paid', status='confirmed', updated_at=now()
      WHERE external_case_id=${caseId} AND lawyer_id=${lawyerId}
        AND stripe_checkout_session_id=${session.id}
      RETURNING id, lawyer_id, meeting_start, meeting_uid, client_name,
        client_email, brief
    `;
    if (paidCase) {
      if (paidInquiry) {
        await recordMatterEvent(
          paidInquiry.id,
          "system",
          "Repere",
          "payment",
          "Payment confirmed — the consultation is now booked",
        );
        if (paidInquiry.meeting_start) {
          const [organizer] = await lawyers`
            SELECT a.email, l.name, COALESCE(c.duration_minutes, 30) AS duration_minutes
            FROM lawyers l
            JOIN lawyer_accounts a ON a.id=l.account_id
            LEFT JOIN calendar_settings c ON c.lawyer_id=l.id
            WHERE l.id=${paidInquiry.lawyer_id}
          `;
          if (organizer) {
            const invitation = await sendMeetingInvite({
              uid: paidInquiry.meeting_uid || undefined,
              start: new Date(paidInquiry.meeting_start),
              durationMinutes: Number(organizer.duration_minutes || 30),
              lawyerName: organizer.name,
              lawyerEmail: organizer.email,
              clientName: paidInquiry.client_name,
              clientEmail: paidInquiry.client_email,
              brief: paidInquiry.brief,
            });
            await lawyers`
              UPDATE inquiries SET meeting_uid=${invitation.uid},
                invite_sent_at=${invitation.sent ? new Date() : null}, updated_at=now()
              WHERE id=${paidInquiry.id}
            `;
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

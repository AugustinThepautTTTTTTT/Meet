import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getClientDb, getLawyerDb } from "@/lib/database";
import { sendRequestReceived } from "@/lib/meeting-invite";
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
      UPDATE cases SET payment_status='paid', status='meeting_requested',
        stripe_payment_intent_id=${String(session.payment_intent || '')},
        stripe_checkout_url='', updated_at=now()
      WHERE id=${caseId} AND stripe_checkout_session_id=${session.id}
        AND payment_status<>'paid'
      RETURNING client_name, client_email, selected_lawyer_name, meeting_time, brief
    `;
    const [paidInquiry] = await lawyers`
      UPDATE inquiries SET payment_status='paid', status='pending', updated_at=now()
      WHERE external_case_id=${caseId} AND lawyer_id=${lawyerId}
        AND stripe_checkout_session_id=${session.id}
      RETURNING id
    `;
    if (paidCase) {
      if (paidInquiry)
        await recordMatterEvent(
          paidInquiry.id,
          "system",
          "Meet",
          "payment",
          "Payment confirmed and matter workspace opened",
        );
      await sendRequestReceived({
        clientName: paidCase.client_name,
        clientEmail: paidCase.client_email,
        lawyerName: paidCase.selected_lawyer_name,
        meetingTime: paidCase.meeting_time,
        brief: paidCase.brief,
      });
    }
  }

  return NextResponse.json({ received: true });
}

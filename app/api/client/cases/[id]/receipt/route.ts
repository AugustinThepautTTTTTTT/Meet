import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getClientAccountId } from "@/lib/auth";
import { getClientDb } from "@/lib/database";
import { getStripe } from "@/lib/stripe";
import { ensureClientWorkflowSchema } from "@/lib/workflow-schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const accountId = await getClientAccountId();
  if (!accountId) return NextResponse.redirect(new URL("/client/account", request.url));

  await ensureClientWorkflowSchema();
  const { id } = await params;
  const sql = getClientDb();
  const [record] = await sql`
    SELECT stripe_payment_intent_id FROM cases
    WHERE id=${id} AND client_account_id=${accountId} AND payment_status='paid'
  `;
  if (!record?.stripe_payment_intent_id)
    return NextResponse.json({ error: "Receipt not available." }, { status: 404 });

  const intent = await getStripe().paymentIntents.retrieve(
    record.stripe_payment_intent_id,
    { expand: ["latest_charge"] },
  );
  const charge = intent.latest_charge as Stripe.Charge | null;
  if (!charge?.receipt_url)
    return NextResponse.json({ error: "Receipt not available." }, { status: 404 });
  return NextResponse.redirect(charge.receipt_url);
}

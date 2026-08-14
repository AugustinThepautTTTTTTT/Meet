import { NextResponse } from "next/server";
import { getClientAccountId } from "@/lib/auth";
import { getClientDb, getLawyerDb } from "@/lib/database";
import { ensureClientWorkflowSchema, ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

export async function GET() {
  const accountId = await getClientAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await Promise.all([ensureClientWorkflowSchema(), ensureLawyerWorkflowSchema()]);
  const sql = getClientDb();
  const [account] =
    await sql`SELECT id,name,email,created_at FROM client_accounts WHERE id=${accountId}`;
  const cases = await sql`
    SELECT id, brief, status, selected_lawyer_slug, selected_lawyer_name,
      meeting_time, meeting_start, meeting_url, created_at, updated_at
      , payment_status, payment_amount_cents, payment_currency
      , stripe_checkout_url
    FROM cases WHERE client_account_id=${accountId}
    ORDER BY updated_at DESC
  `;
  const lawyers = getLawyerDb();
  const casesWithMatters = await Promise.all(
    cases.map(async (item) => {
      const [inquiry] = await lawyers`
        SELECT id FROM inquiries WHERE external_case_id=${item.id}
          AND status<>'payment_pending' ORDER BY updated_at DESC LIMIT 1
      `;
      return { ...item, matter_id: inquiry?.id || null };
    }),
  );
  return NextResponse.json({ account, cases: casesWithMatters });
}

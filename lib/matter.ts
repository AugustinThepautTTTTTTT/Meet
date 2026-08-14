import { getAccountId, getClientAccountId } from "@/lib/auth";
import { getClientDb, getLawyerDb } from "@/lib/database";
import { ensureClientWorkflowSchema, ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

export type MatterRole = "client" | "lawyer";

export async function authorizeMatter(inquiryId: string) {
  const [lawyerAccountId, clientAccountId] = await Promise.all([
    getAccountId(),
    getClientAccountId(),
  ]);
  if (!lawyerAccountId && !clientAccountId) return null;

  await Promise.all([ensureClientWorkflowSchema(), ensureLawyerWorkflowSchema()]);
  const lawyers = getLawyerDb();
  const [inquiry] = await lawyers`
    SELECT i.*, l.account_id AS lawyer_account_id, l.name AS lawyer_name,
      l.slug AS lawyer_slug
    FROM inquiries i JOIN lawyers l ON l.id=i.lawyer_id
    WHERE i.id=${inquiryId} AND i.status<>'payment_pending'
  `;
  if (!inquiry) return null;

  if (lawyerAccountId && inquiry.lawyer_account_id === lawyerAccountId) {
    const [account] = await lawyers`
      SELECT name FROM lawyer_accounts WHERE id=${lawyerAccountId}
    `;
    return {
      role: "lawyer" as MatterRole,
      name: account?.name || inquiry.lawyer_name,
      inquiry,
    };
  }

  if (clientAccountId) {
    const clients = getClientDb();
    const [clientCase] = await clients`
      SELECT c.*, a.name AS account_name
      FROM cases c JOIN client_accounts a ON a.id=c.client_account_id
      WHERE c.id=${inquiry.external_case_id} AND c.client_account_id=${clientAccountId}
    `;
    if (clientCase)
      return {
        role: "client" as MatterRole,
        name: clientCase.account_name || inquiry.client_name,
        inquiry,
        clientCase,
      };
  }
  return null;
}

export async function recordMatterEvent(
  inquiryId: string,
  actorRole: MatterRole | "system",
  actorName: string,
  eventType: string,
  description: string,
) {
  const sql = getLawyerDb();
  await sql`
    INSERT INTO matter_events (inquiry_id, actor_role, actor_name, event_type, description)
    VALUES (${inquiryId}, ${actorRole}, ${actorName}, ${eventType}, ${description})
  `;
}

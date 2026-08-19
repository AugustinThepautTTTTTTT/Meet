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
    WHERE i.id=${inquiryId}
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

export async function ensureMatterTask(
  inquiryId: string,
  taskKey: string,
  title: string,
  assignedTo: MatterRole,
  createdBy: MatterRole = "lawyer",
) {
  const sql = getLawyerDb();
  await sql`
    INSERT INTO matter_tasks (inquiry_id,title,assigned_to,created_by,task_key)
    VALUES (${inquiryId},${title},${assignedTo},${createdBy},${taskKey})
    ON CONFLICT (inquiry_id,task_key) WHERE task_key<>'' DO NOTHING
  `;
}

export async function completeMatterTask(inquiryId: string, taskKey: string) {
  const sql = getLawyerDb();
  await sql`
    UPDATE matter_tasks SET status='done', completed_at=COALESCE(completed_at,now())
    WHERE inquiry_id=${inquiryId} AND task_key=${taskKey} AND status='open'
  `;
}

export async function reopenMatterTask(
  inquiryId: string,
  taskKey: string,
  title: string,
  assignedTo: MatterRole,
  createdBy: MatterRole = "lawyer",
) {
  const sql = getLawyerDb();
  await ensureMatterTask(inquiryId, taskKey, title, assignedTo, createdBy);
  await sql`
    UPDATE matter_tasks
    SET title=${title}, assigned_to=${assignedTo}, created_by=${createdBy},
      status='open', completed_at=NULL
    WHERE inquiry_id=${inquiryId} AND task_key=${taskKey}
  `;
}

export async function seedPreparationTasks(inquiryId: string, brief: Record<string, unknown>) {
  const missing = Array.isArray(brief?.missingInformation)
    ? brief.missingInformation.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
  await Promise.all([
    ensureMatterTask(inquiryId, "lawyer_prepare", "Préparer la consultation à partir de la synthèse et des pièces", "lawyer"),
    ensureMatterTask(inquiryId, "client_documents", "Vérifier que les documents utiles sont bien partagés", "client"),
    ...missing.map((item, index) => ensureMatterTask(inquiryId, `client_missing_${index}`, item, "client")),
  ]);
}

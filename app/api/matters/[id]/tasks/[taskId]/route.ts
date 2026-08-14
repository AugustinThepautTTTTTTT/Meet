import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";
import { authorizeMatter, recordMatterEvent } from "@/lib/matter";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const actor = await authorizeMatter(id);
  if (!actor)
    return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  const { status } = await request.json();
  if (!['open', 'done'].includes(status))
    return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
  const sql = getLawyerDb();
  const [task] = await sql`
    UPDATE matter_tasks SET status=${status},
      completed_at=${status === "done" ? new Date() : null}
    WHERE id=${taskId} AND inquiry_id=${id}
      AND (${actor.role}='lawyer' OR assigned_to=${actor.role})
    RETURNING id,title,assigned_to,status,due_date,created_by,created_at,completed_at
  `;
  if (!task)
    return NextResponse.json({ error: "Task not found or not assigned to you." }, { status: 404 });
  await recordMatterEvent(id, actor.role, actor.name, "task", `${status === "done" ? "Completed" : "Reopened"} task: ${task.title}`);
  return NextResponse.json({ task });
}

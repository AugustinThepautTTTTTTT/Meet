import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";
import { authorizeMatter, recordMatterEvent } from "@/lib/matter";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await authorizeMatter(id);
  if (!actor)
    return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  if (actor.role !== "lawyer")
    return NextResponse.json({ error: "Only the lawyer can create tasks." }, { status: 403 });
  const { title, assignedTo, dueDate } = await request.json();
  const clean = String(title || "").trim();
  if (!clean || clean.length > 180 || !["client", "lawyer"].includes(assignedTo))
    return NextResponse.json({ error: "Add a task title and assignee." }, { status: 400 });
  const sql = getLawyerDb();
  const [task] = await sql`
    INSERT INTO matter_tasks (inquiry_id,title,assigned_to,due_date,created_by)
    VALUES (${id},${clean},${assignedTo},${dueDate || null},${actor.role})
    RETURNING id,title,assigned_to,status,due_date,created_by,created_at,completed_at
  `;
  await recordMatterEvent(id, actor.role, actor.name, "task", `Created task: ${clean}`);
  return NextResponse.json({ task }, { status: 201 });
}

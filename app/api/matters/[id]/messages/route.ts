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
  const { body } = await request.json();
  const clean = String(body || "").trim();
  if (!clean || clean.length > 4000)
    return NextResponse.json(
      { error: "Write a message of up to 4,000 characters." },
      { status: 400 },
    );
  const sql = getLawyerDb();
  const [message] = await sql`
    INSERT INTO matter_messages (inquiry_id, author_role, author_name, body)
    VALUES (${id}, ${actor.role}, ${actor.name}, ${clean})
    RETURNING id,author_role,author_name,body,created_at
  `;
  await recordMatterEvent(id, actor.role, actor.name, "message", "Posted a message");
  return NextResponse.json({ message }, { status: 201 });
}

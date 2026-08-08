import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";

export async function POST(request: Request) {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, title, excerpt, body, published } = await request.json();
    if (!String(title || "").trim() || !String(body || "").trim()) return NextResponse.json({ error: "A title and article body are required." }, { status: 400 });
    const sql = getLawyerDb();
    const [profile] = await sql`SELECT id FROM lawyers WHERE account_id=${accountId}`;
    if (!profile) return NextResponse.json({ error: "Save your profile before writing an article." }, { status: 400 });
    const [article] = id
      ? await sql`UPDATE posts SET title=${title.trim()},excerpt=${String(excerpt || "").trim()},body=${body.trim()},published=${Boolean(published)},updated_at=now() WHERE id=${id} AND lawyer_id=${profile.id} RETURNING *`
      : await sql`INSERT INTO posts (lawyer_id,title,excerpt,body,published) VALUES (${profile.id},${title.trim()},${String(excerpt || "").trim()},${body.trim()},${Boolean(published)}) RETURNING *`;
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ article }, { status: id ? 200 : 201 });
  } catch (error) {
    console.error("article_save_failed", error);
    return NextResponse.json({ error: "The article could not be saved." }, { status: 500 });
  }
}

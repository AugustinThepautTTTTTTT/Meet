import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";

export async function POST(request: Request) {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const {
      id,
      title,
      excerpt,
      body,
      cover_image_url,
      content,
      theme,
      author_note,
      cover_settings,
      published,
    } = await request.json();
    const blocks = Array.isArray(content) ? content.slice(0, 80) : [];
    if (
      !String(title || "").trim() ||
      (!String(body || "").trim() && !blocks.length)
    )
      return NextResponse.json(
        { error: "A title and article content are required." },
        { status: 400 },
      );
    const sql = getLawyerDb();
    const [profile] =
      await sql`SELECT id FROM lawyers WHERE account_id=${accountId}`;
    if (!profile)
      return NextResponse.json(
        { error: "Save your profile before writing an article." },
        { status: 400 },
      );
    const slug = `${String(title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(
        /^-|-$/g,
        "",
      )}-${id ? String(id).slice(0, 6) : Date.now().toString(36)}`;
    const [article] = id
      ? await sql`UPDATE posts SET slug=CASE WHEN slug='' THEN ${slug} ELSE slug END,title=${title.trim()},excerpt=${String(excerpt || "").trim()},body=${String(body || "").trim()},cover_image_url=${String(cover_image_url || "")},cover_settings=${JSON.stringify(cover_settings || { position: 50, zoom: 100 })}::jsonb,content=${JSON.stringify(blocks)}::jsonb,theme=${String(theme || "editorial")},author_note=${String(author_note || "")},published=${Boolean(published)},updated_at=now() WHERE id=${id} AND lawyer_id=${profile.id} RETURNING *`
      : await sql`INSERT INTO posts (lawyer_id,slug,title,excerpt,body,cover_image_url,cover_settings,content,theme,author_note,published) VALUES (${profile.id},${slug},${title.trim()},${String(excerpt || "").trim()},${String(body || "").trim()},${String(cover_image_url || "")},${JSON.stringify(cover_settings || { position: 50, zoom: 100 })}::jsonb,${JSON.stringify(blocks)}::jsonb,${String(theme || "editorial")},${String(author_note || "")},${Boolean(published)}) RETURNING *`;
    if (!article)
      return NextResponse.json(
        { error: "Article not found." },
        { status: 404 },
      );
    return NextResponse.json({ article }, { status: id ? 200 : 201 });
  } catch (error) {
    console.error("article_save_failed", error);
    return NextResponse.json(
      { error: "The article could not be saved." },
      { status: 500 },
    );
  }
}

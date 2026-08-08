import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getLawyerDb();
  const [account] =
    await sql`SELECT id,name,email,created_at FROM lawyer_accounts WHERE id=${accountId}`;
  const [profile] =
    await sql`SELECT * FROM lawyers WHERE account_id=${accountId}`;
  const articles = profile
    ? await sql`SELECT id,slug,title,excerpt,body,cover_image_url,cover_settings,content,theme,author_note,published,created_at,updated_at FROM posts WHERE lawyer_id=${profile.id} ORDER BY updated_at DESC`
    : [];
  return NextResponse.json({ account, profile: profile || null, articles });
}

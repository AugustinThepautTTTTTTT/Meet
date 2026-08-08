import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";

export async function GET() {
  try {
    const sql = getLawyerDb();
    const rows = await sql`
      SELECT l.*, p.title AS post
      FROM lawyers l
      LEFT JOIN LATERAL (
        SELECT title FROM posts WHERE lawyer_id = l.id AND published = true ORDER BY created_at DESC LIMIT 1
      ) p ON true
      WHERE l.published = true
      ORDER BY l.featured_rank ASC, l.created_at ASC
    `;
    const lawyers = rows.map((row) => ({
      initials: row.initials, name: row.name, specialty: row.specialty, practice: row.practice,
      location: row.location, languages: row.languages, match: row.match, price: row.price,
      availability: row.availability, accent: row.accent, reasons: row.reasons, bio: row.bio,
      experience: row.experience, credentials: row.credentials, tags: row.tags,
      keywords: row.keywords, post: row.post || "Practical legal guidance for clients",
    }));
    return NextResponse.json({ lawyers });
  } catch (error) {
    console.error("lawyer_list_failed", error);
    return NextResponse.json({ error: "Lawyer profiles are temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Sign in to publish a lawyer profile." },
    { status: 401 },
  );
}

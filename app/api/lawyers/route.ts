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
  try {
    const profile = await request.json();
    if (!profile.name?.trim() || !profile.title?.trim()) {
      return NextResponse.json({ error: "Name and professional title are required." }, { status: 400 });
    }
    const sql = getLawyerDb();
    const slug = profile.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tags = String(profile.specialties || "General advice").split(",").map((item: string) => item.trim()).filter(Boolean);
    const [lawyer] = await sql`
      INSERT INTO lawyers (slug, initials, name, specialty, practice, location, languages, price, availability, accent, reasons, bio, experience, credentials, tags, keywords, published)
      VALUES (${slug}, ${profile.name.split(/\s+/).map((part: string) => part[0]).join("").slice(0,2).toUpperCase()}, ${profile.name.trim()}, ${profile.title.trim()}, ${tags[0] || "General"}, ${profile.city || "Remote"}, ${profile.languages || "English"}, ${profile.fee || "Contact for pricing"}, 'Within one business day', 'blue', ${[profile.approach || "Client-focused advice", `${profile.experience || "Experienced"} practitioner`]}, ${profile.bio || "Clear, practical legal guidance."}, ${profile.experience || "Experienced"}, 'Credentials pending verification', ${tags}, ${tags.map((tag: string) => tag.toLowerCase())}, true)
      ON CONFLICT (slug) DO UPDATE SET
        specialty = EXCLUDED.specialty, location = EXCLUDED.location, languages = EXCLUDED.languages,
        price = EXCLUDED.price, reasons = EXCLUDED.reasons, bio = EXCLUDED.bio,
        experience = EXCLUDED.experience, tags = EXCLUDED.tags, keywords = EXCLUDED.keywords,
        published = true, updated_at = now()
      RETURNING *
    `;
    if (profile.post?.trim()) await sql`
      INSERT INTO posts (lawyer_id, title, body, published)
      VALUES (${lawyer.id}, ${profile.post.trim()}, ${`A practical introduction to ${profile.post.trim().toLowerCase()}.`}, true)
    `;
    return NextResponse.json({ lawyer }, { status: 201 });
  } catch (error) {
    console.error("lawyer_publish_failed", error);
    return NextResponse.json({ error: "The profile could not be published." }, { status: 500 });
  }
}

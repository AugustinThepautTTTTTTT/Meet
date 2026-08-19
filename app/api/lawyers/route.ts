import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";
import { ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

export async function GET() {
  try {
    await ensureLawyerWorkflowSchema();
    const sql = getLawyerDb();
    const rows = await sql`
      WITH preferred_lawyers AS (
        SELECT l.*, ROW_NUMBER() OVER (
          PARTITION BY lower(name)
          ORDER BY (account_id IS NOT NULL) DESC, created_at DESC
        ) AS profile_priority
        FROM lawyers l
        WHERE published = true
      )
      SELECT l.*, p.title AS post, p.slug AS post_slug
      FROM preferred_lawyers l
      LEFT JOIN LATERAL (
        SELECT title, slug FROM posts WHERE lawyer_id = l.id AND published = true ORDER BY created_at DESC LIMIT 1
      ) p ON true
      WHERE l.profile_priority = 1
      ORDER BY l.featured_rank ASC, l.created_at ASC
    `;
    const lawyers = rows.map((row) => ({
      slug: row.slug,
      initials: row.initials,
      name: row.name,
      specialty: row.specialty,
      practice: row.practice,
      location: row.location,
      languages: row.languages,
      match: row.match,
      price: row.price,
      firstConsultationPriceCents: row.first_consultation_price_cents,
      consultationCurrency: row.consultation_currency,
      firstConsultationFree: row.first_consultation_free,
      availability: row.availability,
      accent: row.accent,
      reasons: row.reasons,
      bio: row.bio,
      experience: row.experience,
      credentials: row.credentials,
      tags: row.tags,
      keywords: row.keywords,
      post: row.post || "Practical legal guidance for clients",
      postSlug: row.post_slug,
      profilePhotoUrl: row.profile_photo_url,
      coverPhotoUrl: row.cover_photo_url,
      tagline: row.tagline,
    }));
    return NextResponse.json({ lawyers }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("lawyer_list_failed", error);
    return NextResponse.json(
      { error: "Lawyer profiles are temporarily unavailable." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Sign in to publish a lawyer profile." },
    { status: 401 },
  );
}

import { NextResponse } from "next/server";
import { getAccountId } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";

const text = (value: unknown, fallback = "") =>
  String(value || fallback).trim();
const list = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export async function PUT(request: Request) {
  const accountId = await getAccountId();
  if (!accountId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const p = await request.json();
    if (!text(p.name) || !text(p.specialty))
      return NextResponse.json(
        { error: "Name and professional title are required." },
        { status: 400 },
      );
    const sql = getLawyerDb();
    const baseSlug =
      text(p.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "lawyer";
    const slug = `${baseSlug}-${accountId.slice(0, 6)}`;
    const tags = list(p.tags);
    const reasons = list(p.reasons);
    const initials = text(p.name)
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const [profile] = await sql`
      INSERT INTO lawyers (account_id,slug,initials,name,specialty,practice,location,languages,price,availability,accent,reasons,bio,experience,credentials,tags,keywords,published,profile_photo_url,cover_photo_url,tagline,firm_name,website,linkedin,education,awards,services,consultation_format,photo_settings,cover_settings)
      VALUES (${accountId},${slug},${initials},${text(p.name)},${text(p.specialty)},${text(p.practice, "General")},${text(p.location, "Remote")},${text(p.languages, "English")},${text(p.price, "Contact for pricing")},${text(p.availability, "Within one business day")},${text(p.accent, "blue")},${reasons},${text(p.bio, "Clear, practical legal guidance.")},${text(p.experience, "Experienced")},${text(p.credentials, "Credentials pending verification")},${tags},${tags.map((tag) => tag.toLowerCase())},${Boolean(p.published)},${text(p.profile_photo_url)},${text(p.cover_photo_url)},${text(p.tagline)},${text(p.firm_name)},${text(p.website)},${text(p.linkedin)},${text(p.education)},${list(p.awards)},${list(p.services)},${text(p.consultation_format, "Video or in person")},${JSON.stringify(p.photo_settings || { position: 50, zoom: 100 })}::jsonb,${JSON.stringify(p.cover_settings || { position: 50, zoom: 100 })}::jsonb)
      ON CONFLICT (account_id) DO UPDATE SET slug=EXCLUDED.slug,initials=EXCLUDED.initials,name=EXCLUDED.name,specialty=EXCLUDED.specialty,practice=EXCLUDED.practice,location=EXCLUDED.location,languages=EXCLUDED.languages,price=EXCLUDED.price,availability=EXCLUDED.availability,accent=EXCLUDED.accent,reasons=EXCLUDED.reasons,bio=EXCLUDED.bio,experience=EXCLUDED.experience,credentials=EXCLUDED.credentials,tags=EXCLUDED.tags,keywords=EXCLUDED.keywords,published=EXCLUDED.published,profile_photo_url=EXCLUDED.profile_photo_url,cover_photo_url=EXCLUDED.cover_photo_url,tagline=EXCLUDED.tagline,firm_name=EXCLUDED.firm_name,website=EXCLUDED.website,linkedin=EXCLUDED.linkedin,education=EXCLUDED.education,awards=EXCLUDED.awards,services=EXCLUDED.services,consultation_format=EXCLUDED.consultation_format,photo_settings=EXCLUDED.photo_settings,cover_settings=EXCLUDED.cover_settings,updated_at=now()
      RETURNING *`;
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("profile_save_failed", error);
    return NextResponse.json(
      { error: "Your profile could not be saved." },
      { status: 500 },
    );
  }
}

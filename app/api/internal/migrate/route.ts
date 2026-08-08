import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getLawyerDb } from "@/lib/database";

function authorized(request: Request) {
  const supplied = Buffer.from(request.headers.get("x-migration-key") || "");
  const expected = Buffer.from(process.env.MIGRATION_SECRET || "");
  return (
    supplied.length > 0 &&
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getLawyerDb();
  await sql`CREATE TABLE IF NOT EXISTS lawyer_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,email text UNIQUE NOT NULL,password_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS account_id uuid UNIQUE REFERENCES lawyer_accounts(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS profile_photo_url text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS cover_photo_url text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS firm_name text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS linkedin text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS education text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS awards text[] NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}'`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS consultation_format text NOT NULL DEFAULT 'Video or in person'`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS photo_settings jsonb NOT NULL DEFAULT '{"position":50,"zoom":100}'::jsonb`;
  await sql`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS cover_settings jsonb NOT NULL DEFAULT '{"position":50,"zoom":100}'::jsonb`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_url text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'editorial'`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_note text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_settings jsonb NOT NULL DEFAULT '{"position":50,"zoom":100}'::jsonb`;
  await sql`UPDATE posts SET slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||left(id::text,6) WHERE slug=''`;
  return NextResponse.json({ ok: true });
}

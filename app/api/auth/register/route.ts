import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (
      !String(name || "").trim() ||
      !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
      String(password || "").length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Add your name, a valid email, and a password of at least 8 characters.",
        },
        { status: 400 },
      );
    }
    const sql = getLawyerDb();
    const existing =
      await sql`SELECT id FROM lawyer_accounts WHERE email=${cleanEmail}`;
    if (existing.length)
      return NextResponse.json(
        { error: "An account already exists for this email." },
        { status: 409 },
      );
    const passwordHash = await hash(password, 12);
    const [account] =
      await sql`INSERT INTO lawyer_accounts (name,email,password_hash) VALUES (${name.trim()},${cleanEmail},${passwordHash}) RETURNING id`;
    await createSession(account.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("lawyer_register_failed", error);
    return NextResponse.json(
      { error: "The account could not be created." },
      { status: 500 },
    );
  }
}

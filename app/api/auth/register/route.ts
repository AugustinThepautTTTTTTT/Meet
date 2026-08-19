import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";
import { checkRateLimit, clearRateLimit, requestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rateKey = `lawyer-register:${requestIp(request)}`;
    const rate = checkRateLimit(rateKey, 5, 60 * 60_000);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
      );
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
            "Ajoutez votre nom, une adresse e-mail valide et un mot de passe d’au moins 8 caractères.",
        },
        { status: 400 },
      );
    }
    const sql = getLawyerDb();
    const existing =
      await sql`SELECT id FROM lawyer_accounts WHERE email=${cleanEmail}`;
    if (existing.length)
      return NextResponse.json(
        { error: "Un compte existe déjà pour cette adresse e-mail." },
        { status: 409 },
      );
    const passwordHash = await hash(password, 12);
    const [account] =
      await sql`INSERT INTO lawyer_accounts (name,email,password_hash) VALUES (${name.trim()},${cleanEmail},${passwordHash}) RETURNING id`;
    await createSession(account.id);
    clearRateLimit(rateKey);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("lawyer_register_failed", error);
    return NextResponse.json(
      { error: "Le compte n’a pas pu être créé." },
      { status: 500 },
    );
  }
}

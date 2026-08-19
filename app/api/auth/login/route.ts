import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";
import { checkRateLimit, clearRateLimit, requestIp } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$HuQ18cZ1EypHePLIWW6Xbe9mEkuHMHjk7BB4vDacBvLegB9NItIW2";

export async function POST(request: Request) {
  try {
    const rateKey = `lawyer-login:${requestIp(request)}`;
    const rate = checkRateLimit(rateKey);
    if (!rate.allowed)
      return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
    const { email, password } = await request.json();
    const sql = getLawyerDb();
    const [account] =
      await sql`SELECT id,password_hash FROM lawyer_accounts WHERE email=${String(
        email || "",
      )
        .trim()
        .toLowerCase()}`;
    if (
      !(await compare(String(password || ""), account?.password_hash || DUMMY_HASH))
    ) {
      return NextResponse.json(
        { error: "Adresse e-mail ou mot de passe incorrect." },
        { status: 401 },
      );
    }
    clearRateLimit(rateKey);
    await createSession(account.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("lawyer_login_failed", error);
    return NextResponse.json(
      { error: "La connexion est temporairement indisponible." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClientSession } from "@/lib/auth";
import { getClientDb } from "@/lib/database";
import { ensureClientWorkflowSchema } from "@/lib/workflow-schema";
import { checkRateLimit, clearRateLimit, requestIp } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$HuQ18cZ1EypHePLIWW6Xbe9mEkuHMHjk7BB4vDacBvLegB9NItIW2";

export async function POST(request: Request) {
  const rateKey = `client-login:${requestIp(request)}`;
  const rate = checkRateLimit(rateKey);
  if (!rate.allowed)
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const { email, password } = await request.json();
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();
  await ensureClientWorkflowSchema();
  const sql = getClientDb();
  const [account] =
    await sql`SELECT id,password_hash FROM client_accounts WHERE email=${cleanEmail}`;
  if (
    !(await bcrypt.compare(String(password || ""), account?.password_hash || DUMMY_HASH))
  )
    return NextResponse.json(
      { error: "Adresse e-mail ou mot de passe incorrect." },
      { status: 401 },
    );
  clearRateLimit(rateKey);
  await createClientSession(account.id);
  return NextResponse.json({ ok: true });
}

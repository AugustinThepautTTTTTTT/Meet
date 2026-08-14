import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClientSession } from "@/lib/auth";
import { getClientDb } from "@/lib/database";
import { ensureClientWorkflowSchema } from "@/lib/workflow-schema";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();
  await ensureClientWorkflowSchema();
  const sql = getClientDb();
  const [account] =
    await sql`SELECT id,password_hash FROM client_accounts WHERE email=${cleanEmail}`;
  if (
    !account ||
    !(await bcrypt.compare(String(password || ""), account.password_hash))
  )
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 },
    );
  await createClientSession(account.id);
  return NextResponse.json({ ok: true });
}

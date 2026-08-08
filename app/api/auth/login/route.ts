import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getLawyerDb } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const sql = getLawyerDb();
    const [account] =
      await sql`SELECT id,password_hash FROM lawyer_accounts WHERE email=${String(
        email || "",
      )
        .trim()
        .toLowerCase()}`;
    if (
      !account ||
      !(await compare(String(password || ""), account.password_hash))
    ) {
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    }
    await createSession(account.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("lawyer_login_failed", error);
    return NextResponse.json(
      { error: "Sign in is temporarily unavailable." },
      { status: 500 },
    );
  }
}

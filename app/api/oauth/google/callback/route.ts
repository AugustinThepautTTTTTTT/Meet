import { randomBytes, timingSafeEqual } from "node:crypto";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClientSession, createSession } from "@/lib/auth";
import { getClientDb, getLawyerDb } from "@/lib/database";
import { ensureClientWorkflowSchema, ensureLawyerWorkflowSchema } from "@/lib/workflow-schema";

type GoogleUser = { email?: string; email_verified?: boolean; name?: string };

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = await cookies();
  const state = url.searchParams.get("state") || "";
  const expectedState = store.get("meet_google_state")?.value || "";
  const verifier = store.get("meet_google_verifier")?.value || "";
  const role = store.get("meet_google_role")?.value === "lawyer" ? "lawyer" : "client";
  for (const name of ["meet_google_state", "meet_google_verifier", "meet_google_role"])
    store.delete(name);

  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const failureUrl = role === "lawyer" ? "/lawyer/account?oauth=failed" : "/client/account?oauth=failed";
  if (!state || !expectedState || !verifier || !safeEqual(state, expectedState))
    return NextResponse.redirect(new URL(failureUrl, origin));
  const code = url.searchParams.get("code");
  if (!code || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return NextResponse.redirect(new URL(failureUrl, origin));

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/oauth/google/callback`,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error(`Google token exchange failed: ${tokenResponse.status}`);
    const tokens = await tokenResponse.json();
    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (!userResponse.ok) throw new Error(`Google userinfo failed: ${userResponse.status}`);
    const user = await userResponse.json() as GoogleUser;
    const email = String(user.email || "").trim().toLowerCase();
    if (!user.email_verified || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Google email is not verified");
    const name = String(user.name || email.split("@")[0]).trim();
    const placeholderHash = await hash(randomBytes(32).toString("hex"), 12);

    if (role === "lawyer") {
      await ensureLawyerWorkflowSchema();
      const sql = getLawyerDb();
      const [account] = await sql`
        INSERT INTO lawyer_accounts (name,email,password_hash)
        VALUES (${name},${email},${placeholderHash})
        ON CONFLICT (email) DO UPDATE SET name=CASE WHEN lawyer_accounts.name='' THEN EXCLUDED.name ELSE lawyer_accounts.name END,
          updated_at=now()
        RETURNING id
      `;
      await createSession(account.id);
      return NextResponse.redirect(new URL("/lawyer/dashboard", origin));
    }

    await ensureClientWorkflowSchema();
    const sql = getClientDb();
    const [account] = await sql`
      INSERT INTO client_accounts (name,email,password_hash)
      VALUES (${name},${email},${placeholderHash})
      ON CONFLICT (email) DO UPDATE SET name=CASE WHEN client_accounts.name='' THEN EXCLUDED.name ELSE client_accounts.name END,
        updated_at=now()
      RETURNING id
    `;
    await createClientSession(account.id);
    return NextResponse.redirect(new URL("/client/account", origin));
  } catch (error) {
    console.error(JSON.stringify({ level: "error", msg: "google_oauth_failed", error: error instanceof Error ? error.message : String(error) }));
    return NextResponse.redirect(new URL(failureUrl, origin));
  }
}

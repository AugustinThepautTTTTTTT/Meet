import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function base64url(value: Buffer) {
  return value.toString("base64url");
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId)
    return NextResponse.json({ error: "La connexion Google n’est pas encore configurée." }, { status: 503 });
  const url = new URL(request.url);
  const role = url.searchParams.get("role") === "lawyer" ? "lawyer" : "client";
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(48));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const store = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/oauth/google",
    maxAge: 10 * 60,
  };
  store.set("meet_google_state", state, cookieOptions);
  store.set("meet_google_verifier", verifier, cookieOptions);
  store.set("meet_google_role", role, cookieOptions);

  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return NextResponse.redirect(authorization);
}

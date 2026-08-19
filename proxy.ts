import { NextRequest, NextResponse } from "next/server";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/") || !UNSAFE_METHODS.has(request.method))
    return NextResponse.next();
  if (request.nextUrl.pathname === "/api/webhooks/stripe") return NextResponse.next();

  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== request.nextUrl.origin) || site === "cross-site")
    return NextResponse.json({ error: "Requête intersite refusée." }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };

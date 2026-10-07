import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

/*
 * Optimistic gate only: it checks that a session cookie exists so anonymous
 * visitors see the landing page (at "/") or bounce to /login without rendering
 * anything private. The real check (session lookup, role and per-record access)
 * happens in the data layer.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  // Same URL, different audience: signed-out visitors get the public landing page.
  if (pathname === "/") return NextResponse.rewrite(new URL("/welcome", request.url));

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!login|welcome|api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt)$).*)",
  ],
};

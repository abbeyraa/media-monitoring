import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionCookieName, parseSessionCookieValue } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = parseSessionCookieValue(request.cookies.get(getSessionCookieName())?.value);
  const isAuthenticated = Boolean(session);

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/login") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};

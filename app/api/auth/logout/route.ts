import { cookies } from "next/headers";

import { getSessionCookieName } from "@/lib/auth";
import { clearSession, hydrateSessionFromCookie } from "@/lib/session-store";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const session = hydrateSessionFromCookie(cookieStore.get(getSessionCookieName())?.value);

  if (session) {
    clearSession(session.sessionId);
  }

  cookieStore.delete(getSessionCookieName());

  return Response.json({ ok: true });
}

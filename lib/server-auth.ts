import { cookies } from "next/headers";

import { getSessionCookieName } from "@/lib/auth";
import { hydrateSessionFromCookie } from "@/lib/session-store";

export async function requireSession() {
  const cookieStore = await cookies();
  const session = hydrateSessionFromCookie(cookieStore.get(getSessionCookieName())?.value);

  return session;
}

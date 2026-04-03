import { cookies } from "next/headers";

import {
  createSessionCookieValue,
  getSessionCookieName,
  getSessionCookieOptions,
  isValidLogin,
} from "@/lib/auth";
import { hydrateSessionFromCookie } from "@/lib/session-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return Response.json(
      { ok: false, message: "Username dan password wajib diisi." },
      { status: 400 },
    );
  }

  if (!isValidLogin(username, password)) {
    return Response.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  const cookieValue = createSessionCookieValue(username);
  const session = hydrateSessionFromCookie(cookieValue);

  if (!session) {
    return Response.json(
      { ok: false, message: "Session tidak bisa dibuat." },
      { status: 500 },
    );
  }

  cookieStore.set(getSessionCookieName(), cookieValue, getSessionCookieOptions());

  return Response.json({ ok: true, username });
}

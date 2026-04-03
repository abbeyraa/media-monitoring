import { requireSession } from "@/lib/server-auth";

export const runtime = "nodejs";

const endpoints = [
  "http://127.0.0.1:8000/health",
  "http://127.0.0.1:8000/session/check",
] as const;

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return Response.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      });
      const bodyText = await response.text();

      if (response.ok) {
        return Response.json({
          ok: true,
          reachable: true,
          endpoint,
          status: response.status,
          body: bodyText,
          checkedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Try the next endpoint.
    }
  }

  return Response.json(
    {
      ok: false,
      reachable: false,
      message: "Local API di localhost:8000 tidak merespons endpoint health maupun session/check.",
      checkedAt: new Date().toISOString(),
    },
    { status: 503 },
  );
}

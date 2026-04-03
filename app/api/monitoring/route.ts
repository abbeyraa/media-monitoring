import { getTargets } from "@/lib/session-store";
import { getMonitoringSections, normalizeContentLimit } from "@/lib/social/service";
import { requireSession } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return Response.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  const targets = getTargets(session.sessionId);
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "5");
  const contentLimit = normalizeContentLimit(limitParam);
  const sections = await getMonitoringSections(targets, contentLimit);

  return Response.json({
    ok: true,
    targets,
    sections,
    contentLimit,
    refreshedAt: new Date().toISOString(),
  });
}

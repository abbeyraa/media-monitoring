import { getMonitoringSections } from "@/lib/social/service";
import { setTargets } from "@/lib/session-store";
import { requireSession } from "@/lib/server-auth";

export const runtime = "nodejs";

function normalizeValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return Response.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    youtube?: string;
    instagram?: string;
    tiktok?: string;
  };

  const targets = {
    youtube: normalizeValue(body.youtube),
    instagram: normalizeValue(body.instagram),
    tiktok: normalizeValue(body.tiktok),
  };

  const updatedTargets = setTargets(session.sessionId, targets);

  if (!updatedTargets) {
    return Response.json(
      { ok: false, message: "Session tidak ditemukan." },
      { status: 401 },
    );
  }

  const contentLimit = 5;
  const sections = await getMonitoringSections(updatedTargets, contentLimit);

  return Response.json({
    ok: true,
    targets: updatedTargets,
    sections,
    contentLimit,
    refreshedAt: new Date().toISOString(),
  });
}

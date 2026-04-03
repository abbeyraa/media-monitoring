import { requireSession } from "@/lib/server-auth";

export const runtime = "nodejs";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function getAllowedBaseUrl() {
  return process.env.SOCIAL_API_BASE_URL ?? "http://127.0.0.1:8000";
}

function buildFallbackHeaders(contentType: string | null) {
  return {
    "Cache-Control": "private, max-age=300",
    "Content-Type": contentType ?? "application/octet-stream",
  };
}

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src")?.trim();

  if (!src) {
    return new Response("Missing src parameter.", { status: 400 });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(src);
  } catch {
    return new Response("Invalid src parameter.", { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(targetUrl.protocol)) {
    return new Response("Unsupported protocol.", { status: 400 });
  }

  const allowedOrigin = new URL(getAllowedBaseUrl()).origin;

  if (targetUrl.origin !== allowedOrigin) {
    return new Response("Forbidden image origin.", { status: 403 });
  }

  let upstream: Response;

  try {
    upstream = await fetch(targetUrl, {
      cache: "no-store",
    });
  } catch {
    return new Response("Image upstream is unreachable.", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Image upstream responded with an error.", {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get("content-type");
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: buildFallbackHeaders(contentType),
  });
}

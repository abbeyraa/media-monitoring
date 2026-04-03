import type { MonitoringTargets } from "@/lib/session-store";
import { getSocialProvider } from "@/lib/social/provider";
import type { SocialPlatform } from "@/lib/social/types";

const platformOrder: SocialPlatform[] = ["youtube", "instagram", "tiktok"];
const DEFAULT_CONTENT_LIMIT = 5;

export function normalizeContentLimit(value: number) {
  if (Number.isNaN(value)) {
    return DEFAULT_CONTENT_LIMIT;
  }

  return Math.min(DEFAULT_CONTENT_LIMIT, Math.max(1, Math.floor(value)));
}

export async function getMonitoringSections(targets: MonitoringTargets, contentLimit = 7) {
  const normalizedLimit = normalizeContentLimit(contentLimit);
  const sections = [];

  for (const platform of platformOrder) {
    const identifier = targets[platform];

    if (!identifier) {
      sections.push({
        platform,
        status: "idle" as const,
        message: "Belum ada akun yang disimpan.",
        accountName: "",
        accountHandle: "",
        profileImageUrl: "",
        totalViews: 0,
        items: [],
        source: "api" as const,
      });
      continue;
    }

    try {
      const provider = getSocialProvider(platform, normalizedLimit);
      const snapshot = await provider.fetchSnapshot({ identifier });
      const items = snapshot.items.slice(0, normalizedLimit);
      const totalViews = items.reduce((total, item) => total + item.views, 0);

      sections.push({
        ...snapshot,
        items,
        totalViews,
        status: "ready" as const,
        message: "",
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Gagal mengambil data untuk akun ini dari API scraper lokal.";

      sections.push({
        platform,
        status: "error" as const,
        message,
        accountName: identifier,
        accountHandle: identifier.startsWith("@") ? identifier : `@${identifier}`,
        profileImageUrl: "",
        totalViews: 0,
        items: [],
        source: "api" as const,
      });
    }
  }

  return sections;
}

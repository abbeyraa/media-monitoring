import type {
  SocialAccountSnapshot,
  SocialContentItem,
  SocialPlatform,
  SocialProvider,
  SocialProviderContext,
} from "@/lib/social/types";
import { toProxiedImageUrl } from "@/lib/social/image-proxy";

type ScrapeProfileSuccessResponse = {
  ok: true;
  data: {
    platform: SocialPlatform;
    username: string;
    handle?: string | null;
    profile_picture_url?: string | null;
    profile_picture_proxy_url?: string | null;
    recent_contents?: Array<{
      content_url?: string | null;
      content_type?: string | null;
      views?: number | null;
      published_at?: string | null;
    }>;
    error?: string | null;
  };
  error: null;
};

type ScrapeProfileErrorResponse = {
  ok: false;
  data?: {
    error?: string | null;
  } | null;
  error?: string | null;
};

type ScrapeProfileResponse = ScrapeProfileSuccessResponse | ScrapeProfileErrorResponse;

function getApiBaseUrl() {
  return process.env.SOCIAL_API_BASE_URL ?? "http://127.0.0.1:8000";
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().replace(/^@/, "");
}

function toContentItem(contentUrl: string, item: NonNullable<ScrapeProfileSuccessResponse["data"]["recent_contents"]>[number]): SocialContentItem {
  return {
    id: contentUrl,
    contentUrl,
    contentType: item.content_type?.trim() || "content",
    views: typeof item.views === "number" && Number.isFinite(item.views) ? item.views : 0,
    publishedAt: item.published_at ?? null,
  };
}

export class ApiSocialProvider implements SocialProvider {
  constructor(
    private readonly platform: SocialPlatform,
    private readonly recentLimit: number,
  ) {}

  async fetchSnapshot(context: SocialProviderContext): Promise<SocialAccountSnapshot> {
    const username = normalizeIdentifier(context.identifier);
    const endpoint = new URL("/scrape/profile", getApiBaseUrl());
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: this.platform,
        username,
        recent_limit: this.recentLimit,
      }),
    });

    const rawBody = await response.text();
    let payload: ScrapeProfileResponse | null = null;

    try {
      payload = JSON.parse(rawBody) as ScrapeProfileResponse;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      const responseMessage =
        payload?.error ??
        payload?.data?.error ??
        rawBody.trim();
      const message =
        responseMessage ||
        `Scraper ${this.platform} gagal merespons.`;

      throw new Error(message);
    }

    const items = (payload.data.recent_contents ?? [])
      .map((item) => item.content_url?.trim() || "")
      .map((contentUrl, index) => {
        const sourceItem = payload.data.recent_contents?.[index];

        if (!contentUrl || !sourceItem) {
          return null;
        }

        return toContentItem(contentUrl, sourceItem);
      })
      .filter((item): item is SocialContentItem => item !== null);

    const totalViews = items.reduce((total, item) => total + item.views, 0);
    const accountName = payload.data.username?.trim() || username;
    const accountHandle = payload.data.handle?.trim() || `@${accountName}`;
    const profileImageUrl =
      toProxiedImageUrl(
        payload.data.profile_picture_proxy_url?.trim() ||
        payload.data.profile_picture_url?.trim() ||
        "",
      );

    return {
      platform: this.platform,
      accountName,
      accountHandle,
      profileImageUrl,
      totalViews,
      items,
      source: "api",
    };
  }
}

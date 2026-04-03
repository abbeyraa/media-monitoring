export type SocialPlatform = "youtube" | "instagram" | "tiktok";

export type SocialContentItem = {
  id: string;
  contentUrl: string;
  contentType: string;
  views: number;
  publishedAt: string | null;
};

export type SocialAccountSnapshot = {
  platform: SocialPlatform;
  accountName: string;
  accountHandle: string;
  profileImageUrl: string;
  totalViews: number;
  items: SocialContentItem[];
  source: "api";
};

export type SocialProviderContext = {
  identifier: string;
};

export interface SocialProvider {
  fetchSnapshot(context: SocialProviderContext): Promise<SocialAccountSnapshot>;
}

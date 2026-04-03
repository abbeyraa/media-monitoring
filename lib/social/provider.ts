import { ApiSocialProvider } from "@/lib/social/api-provider";
import type { SocialPlatform, SocialProvider } from "@/lib/social/types";

export function getSocialProvider(platform: SocialPlatform, recentLimit: number): SocialProvider {
  return new ApiSocialProvider(platform, recentLimit);
}

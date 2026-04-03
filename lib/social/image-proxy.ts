export function toProxiedImageUrl(imageUrl: string) {
  const normalizedUrl = imageUrl.trim();

  if (!normalizedUrl) {
    return "";
  }

  return `/api/image?src=${encodeURIComponent(normalizedUrl)}`;
}

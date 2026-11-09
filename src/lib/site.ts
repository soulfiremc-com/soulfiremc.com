import en from "./messages/en.json";
export const siteName = "SoulFire";
export const siteUrl =
  import.meta.env?.VITE_SITE_URL?.trim() || "https://soulfiremc.com";
export const siteDescription = en["home.meta.description"];
export const defaultSocialImageUrl = `${siteUrl}/og/site/home/image.webp`;

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (path === "/") {
    return `${siteUrl}/`;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

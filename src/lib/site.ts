import en from "./messages/en.json";
export const siteName = "SoulFire";
// Vite defines import.meta.env. Scripts and tests load this module in Node,
// where it is undefined. Keep the access static: the Vite dev module runner
// rejects reading import.meta.env through another variable.
export const siteUrl =
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- import.meta.env is undefined in Node scripts and tests
  import.meta.env?.VITE_SITE_URL?.trim() || "https://soulfiremc.com";
export const siteDescription = en["home.meta.description"];
export const defaultSocialImageUrl = `${siteUrl}/og/site/home/image.webp`;

export function absoluteUrl(path: string) {
  if (/^https?:\/\//u.test(path)) {
    return path;
  }

  if (path === "/") {
    return `${siteUrl}/`;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

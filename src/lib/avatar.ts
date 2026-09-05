import { createHash } from "node:crypto";

const ALLOWED_AVATAR_HOSTNAMES = new Set([
  "avatars.githubusercontent.com",
  "cdn.discordapp.com",
  "github.com",
  "media.discordapp.net",
  "www.gravatar.com",
  "gravatar.com",
]);

export function getGravatarUrl(email: string, size = 160) {
  const hash = createHash("md5")
    .update(email.trim().toLowerCase())
    .digest("hex");
  const params = new URLSearchParams({
    d: "retro",
    s: String(size),
  });

  return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
}

export function isAllowedRemoteAvatarUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      ALLOWED_AVATAR_HOSTNAMES.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function getAvatarUrl(
  image: string | null | undefined,
  email: string | null | undefined,
  size?: number,
) {
  if (image && isAllowedRemoteAvatarUrl(image)) {
    return image;
  }

  if (!email) {
    return null;
  }

  return getGravatarUrl(email, size);
}

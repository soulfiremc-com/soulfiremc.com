import type { MessageKey } from "@/lib/messages";
export type ClientDownloadOs = "windows" | "macos" | "linux";
export type ClientDownloadArch = "x64" | "arm64";
export type DownloadLinkMap = Record<
  ClientDownloadOs,
  Record<ClientDownloadArch, string>
>;

export type ClientReleaseManifest = {
  version: string;
  pub_date?: string;
};

export type ServerDownload = {
  name: string;
  description: MessageKey;
  url: string;
};

export const CLIENT_RELEASES_URL =
  "https://github.com/soulfiremc-com/SoulFireClient/releases/latest";
export const FLATHUB_URL = "https://flathub.org/apps/com.soulfiremc.soulfire";

const GH_SERVER_BASE =
  "https://github.com/soulfiremc-com/SoulFire/releases/download";
const CLIENT_RELEASE_DOWNLOAD_BASE =
  "https://github.com/soulfiremc-com/SoulFireClient/releases/download";

/** Release assets download in place. Release and store pages open in a new tab. */
export function isReleaseAssetUrl(href: string): boolean {
  return (
    href.startsWith(`${CLIENT_RELEASE_DOWNLOAD_BASE}/`) ||
    href.startsWith(`${GH_SERVER_BASE}/`)
  );
}

export function getClientReleaseNotesUrl(version: string | undefined): string {
  const tag = version?.trim();
  return tag && tag !== "latest"
    ? `https://github.com/soulfiremc-com/SoulFireClient/releases/tag/${encodeURIComponent(tag)}`
    : CLIENT_RELEASES_URL;
}

function buildClientInstallerUrl(
  version: string | undefined,
  os: Exclude<ClientDownloadOs, "linux">,
  arch: ClientDownloadArch,
): string {
  if (!version) {
    return CLIENT_RELEASES_URL;
  }

  const extension = os === "windows" ? "exe" : "dmg";
  return `${CLIENT_RELEASE_DOWNLOAD_BASE}/${version}/SoulFire-${version}-${arch}.${extension}`;
}

export function createClientDownloads(
  manifest: ClientReleaseManifest | null,
): DownloadLinkMap {
  const version = manifest?.version.trim();

  return {
    windows: {
      x64: buildClientInstallerUrl(version, "windows", "x64"),
      arm64: buildClientInstallerUrl(version, "windows", "arm64"),
    },
    macos: {
      x64: buildClientInstallerUrl(version, "macos", "x64"),
      arm64: buildClientInstallerUrl(version, "macos", "arm64"),
    },
    linux: {
      x64: FLATHUB_URL,
      arm64: FLATHUB_URL,
    },
  };
}

export const SERVER_RELEASES_URL =
  "https://github.com/soulfiremc-com/SoulFire/releases/latest";

function buildServerJarUrl(version: string, artifact: string): string {
  const tag = version.trim();
  // Without a resolved version there is no jar URL, so send users to the release page.
  return tag && tag !== "latest"
    ? `${GH_SERVER_BASE}/${tag}/${artifact}-${tag}.jar`
    : SERVER_RELEASES_URL;
}

export function createServerDownloads(version: string): ServerDownload[] {
  return [
    {
      name: "SoulFire CLI",
      description: "download.headlessCommandLineClient",
      url: buildServerJarUrl(version, "SoulFireCLI"),
    },
    {
      name: "SoulFire Dedicated",
      description: "download.dedicatedServerController",
      url: buildServerJarUrl(version, "SoulFireDedicated"),
    },
  ];
}

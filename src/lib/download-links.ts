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
  description: string;
  url: string;
};

export const CLIENT_RELEASES_URL =
  "https://github.com/soulfiremc-com/SoulFireClient/releases/latest";
export const FLATHUB_URL = "https://flathub.org/apps/com.soulfiremc.soulfire";

const GH_SERVER_BASE =
  "https://github.com/soulfiremc-com/SoulFire/releases/download";
const CLIENT_RELEASE_DOWNLOAD_BASE =
  "https://github.com/soulfiremc-com/SoulFireClient/releases/download";

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
  const version = manifest?.version?.trim();

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

export function createServerDownloads(version: string): ServerDownload[] {
  return [
    {
      name: "SoulFire CLI",
      description: "Headless command-line client",
      url: `${GH_SERVER_BASE}/${version}/SoulFireCLI-${version}.jar`,
    },
    {
      name: "SoulFire Dedicated",
      description: "Dedicated server controller",
      url: `${GH_SERVER_BASE}/${version}/SoulFireDedicated-${version}.jar`,
    },
  ];
}

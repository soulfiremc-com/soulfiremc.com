import type { ClientDownloadArch, ClientDownloadOs } from "./download-links";

export function getClientDownloadMeasurement({
  os,
  architecture,
  href,
  retry = false,
}: {
  os: ClientDownloadOs;
  architecture: ClientDownloadArch;
  href: string;
  retry?: boolean;
}) {
  const url = new URL(href);
  const properties = {
    operating_system: os,
    architecture,
    source: "download_page",
    retry,
  };

  if (
    url.origin === "https://flathub.org" &&
    url.pathname === "/apps/com.soulfiremc.soulfire"
  ) {
    return { event: "installer_store_opened", properties };
  }

  const release = url.pathname.match(
    /^\/soulfiremc-com\/SoulFireClient\/releases\/download\/([^/]+)\/SoulFire-[^/]+\.(exe|dmg)$/,
  );
  if (url.origin === "https://github.com" && release) {
    return {
      event: "installer_download_clicked",
      properties: { ...properties, release_version: release[1] },
    };
  }

  if (
    url.origin === "https://github.com" &&
    url.pathname === "/soulfiremc-com/SoulFireClient/releases/latest"
  ) {
    return { event: "installer_releases_opened", properties };
  }

  return null;
}

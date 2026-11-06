import type { ClientDownloadArch, ClientDownloadOs } from "./download-links";

type BrowserPlatform = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
};

export function detectDownloadPlatform(browser: BrowserPlatform) {
  const userAgent = browser.userAgent.toLowerCase();
  const platform = browser.platform?.toLowerCase() ?? "";
  const mobile =
    /android|iphone|ipad|ipod|windows phone/.test(userAgent + " " + platform) ||
    (platform.includes("mac") && (browser.maxTouchPoints ?? 0) > 1);

  return {
    mobile,
    os: mobile ? null : detectBrowserOS(userAgent, platform),
    cpu: mobile ? null : detectBrowserCPU(userAgent, platform),
  };
}

function detectBrowserOS(
  userAgent: string,
  platform: string,
): ClientDownloadOs | null {
  // Check for Windows
  if (userAgent.includes("win") || platform.includes("win")) {
    return "windows";
  }

  // Check for macOS
  if (userAgent.includes("mac") || platform.includes("mac")) {
    return "macos";
  }

  // Check for Linux
  if (
    userAgent.includes("linux") ||
    userAgent.includes("x11") ||
    platform.includes("linux")
  ) {
    return "linux";
  }

  return null;
}

function detectBrowserCPU(
  userAgent: string,
  platform: string,
): ClientDownloadArch | null {
  // Check for ARM architecture
  // Common indicators: aarch64, arm64, arm in platform/userAgent
  if (
    platform.includes("aarch64") ||
    platform.includes("arm64") ||
    platform.includes("arm") ||
    userAgent.includes("aarch64") ||
    userAgent.includes("arm64")
  ) {
    return "arm64";
  }

  // Check for x86_64/AMD64 architecture
  // Common indicators: x86_64, x64, amd64, win64, wow64 (Windows 64-bit), x86_64 in platform
  if (
    platform.includes("x86_64") ||
    platform.includes("x64") ||
    platform.includes("amd64") ||
    platform.includes("win64") ||
    userAgent.includes("x86_64") ||
    userAgent.includes("x64") ||
    userAgent.includes("amd64") ||
    userAgent.includes("win64") ||
    userAgent.includes("wow64")
  ) {
    return "x64";
  }

  return null;
}

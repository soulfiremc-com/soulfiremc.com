import assert from "node:assert/strict";
import test from "node:test";
import { createClientDownloads } from "@/lib/download-links";
import { getClientDownloadMeasurement } from "@/lib/download-measurement";

void test("installer intent records the selected build without the destination URL", () => {
  const links = createClientDownloads({ version: "2.10.6" });
  assert.deepEqual(
    getClientDownloadMeasurement({
      os: "windows",
      architecture: "arm64",
      href: links.windows.arm64,
    }),
    {
      event: "installer_download_clicked",
      properties: {
        operating_system: "windows",
        architecture: "arm64",
        source: "download_page",
        retry: false,
        release_version: "2.10.6",
      },
    },
  );
  assert.equal(
    getClientDownloadMeasurement({
      os: "macos",
      architecture: "x64",
      href: links.macos.x64,
      retry: true,
    })?.properties.retry,
    true,
  );
});

void test("store and release-page visits are not counted as installer downloads", () => {
  const links = createClientDownloads(null);
  assert.equal(
    getClientDownloadMeasurement({
      os: "linux",
      architecture: "x64",
      href: links.linux.x64,
    })?.event,
    "installer_store_opened",
  );
  assert.equal(
    getClientDownloadMeasurement({
      os: "windows",
      architecture: "x64",
      href: links.windows.x64,
    })?.event,
    "installer_releases_opened",
  );
});

void test("unrecognized destinations cannot generate an installer conversion", () => {
  assert.equal(
    getClientDownloadMeasurement({
      os: "windows",
      architecture: "x64",
      href: "https://example.com/SoulFire.exe",
    }),
    null,
  );
});

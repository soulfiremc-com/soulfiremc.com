import assert from "node:assert/strict";
import test from "node:test";
import {
  type ClientReleaseManifest,
  createClientDownloads,
  getClientReleaseNotesUrl,
} from "@/lib/download-links";

test("createClientDownloads builds desktop installer URLs and keeps Linux on Flathub", () => {
  const manifest = {
    version: "2.8.6",
    pub_date: "2026-04-14T19:49:44.763Z",
  } satisfies ClientReleaseManifest;

  const downloads = createClientDownloads(manifest);

  assert.equal(
    downloads.windows.x64,
    "https://github.com/soulfiremc-com/SoulFireClient/releases/download/2.8.6/SoulFire-2.8.6-x64.exe",
  );
  assert.equal(
    downloads.windows.arm64,
    "https://github.com/soulfiremc-com/SoulFireClient/releases/download/2.8.6/SoulFire-2.8.6-arm64.exe",
  );
  assert.equal(
    downloads.macos.x64,
    "https://github.com/soulfiremc-com/SoulFireClient/releases/download/2.8.6/SoulFire-2.8.6-x64.dmg",
  );
  assert.equal(
    downloads.macos.arm64,
    "https://github.com/soulfiremc-com/SoulFireClient/releases/download/2.8.6/SoulFire-2.8.6-arm64.dmg",
  );
  assert.equal(
    downloads.linux.x64,
    "https://flathub.org/apps/com.soulfiremc.soulfire",
  );
  assert.equal(
    downloads.linux.arm64,
    "https://flathub.org/apps/com.soulfiremc.soulfire",
  );
});

test("getClientReleaseNotesUrl links the release tag or falls back to the latest release", () => {
  assert.equal(
    getClientReleaseNotesUrl(" 2.10.7 "),
    "https://github.com/soulfiremc-com/SoulFireClient/releases/tag/2.10.7",
  );
  assert.equal(
    getClientReleaseNotesUrl("latest"),
    "https://github.com/soulfiremc-com/SoulFireClient/releases/latest",
  );
  assert.equal(
    getClientReleaseNotesUrl(undefined),
    "https://github.com/soulfiremc-com/SoulFireClient/releases/latest",
  );
});

import release from "./sdk-release.json";

/** The SoulFire release the SDK docs describe. `bun sync-sdk-version` updates it. */
export type SdkRelease = {
  version: string;
  revision: string;
  minecraftVersion: string;
};

export const sdkRelease: SdkRelease = release;

const tokens = {
  "%SOULFIRE_SDK_VERSION%": sdkRelease.version,
  "%SOULFIRE_SDK_REVISION%": sdkRelease.revision,
  "%SOULFIRE_MINECRAFT_VERSION%": sdkRelease.minecraftVersion,
} as const;

const tokenPattern =
  /%SOULFIRE_(?:SDK_VERSION|SDK_REVISION|MINECRAFT_VERSION)%/gu;

/** Replace release placeholders in docs text and code with the current release. */
export function replaceSdkReleaseTokens(text: string) {
  return text.replaceAll(
    tokenPattern,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- tokenPattern only matches the keys of tokens
    (token) => tokens[token as keyof typeof tokens],
  );
}

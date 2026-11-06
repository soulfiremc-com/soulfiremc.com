import { Effect, Schema } from "effect";
import { requestJson, requestText } from "@/lib/backend-http";
import type { ClientReleaseManifest } from "@/lib/download-links";

const CLIENT_LATEST_JSON_URL =
  "https://github.com/soulfiremc-com/SoulFireClient/releases/latest/download/latest.json";
const SERVER_VERSION_URL =
  "https://raw.githubusercontent.com/soulfiremc-com/SoulFireClient/refs/heads/main/soulfire-server-version.txt";

const clientReleaseManifestSchema = Schema.Struct({
  version: Schema.String.check(Schema.isPattern(/\S/)),
  pub_date: Schema.optionalKey(Schema.String),
});

export async function getClientReleaseManifest(): Promise<ClientReleaseManifest> {
  return Effect.runPromise(
    requestJson(CLIENT_LATEST_JSON_URL, clientReleaseManifestSchema),
  );
}

export async function getServerVersion(): Promise<string | undefined> {
  return Effect.runPromise(
    requestText(SERVER_VERSION_URL).pipe(
      Effect.map((version) => version.trim() || undefined),
    ),
  );
}

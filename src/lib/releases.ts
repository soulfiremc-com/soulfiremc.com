import type { ClientReleaseManifest } from "@/lib/download-links";

const CLIENT_LATEST_JSON_URL =
  "https://github.com/soulfiremc-com/SoulFireClient/releases/latest/download/latest.json";
const SERVER_VERSION_URL =
  "https://raw.githubusercontent.com/soulfiremc-com/SoulFireClient/refs/heads/main/soulfire-server-version.txt";

async function fetchOk(input: string): Promise<Response> {
  const response = await fetch(input);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${input}: ${response.status}`);
  }

  return response;
}

export async function getClientReleaseManifest(): Promise<ClientReleaseManifest> {
  const response = await fetchOk(CLIENT_LATEST_JSON_URL);
  return (await response.json()) as ClientReleaseManifest;
}

export async function getServerVersion(): Promise<string | undefined> {
  const response = await fetchOk(SERVER_VERSION_URL);
  return (await response.text()).trim() || undefined;
}

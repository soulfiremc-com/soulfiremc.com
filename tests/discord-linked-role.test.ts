import assert from "node:assert/strict";
import test from "node:test";
import {
  checkLinkedRoleCallback,
  getLinkedRoleAuthorizeUrl,
  getLinkedRolePlatformUsername,
  getLinkedRoleResultUrl,
} from "@/lib/discord-linked-role";

const check = (query: string, storedState?: string) =>
  checkLinkedRoleCallback(new URLSearchParams(query), storedState);

await test("linked-role callback continues only with a code and matching state", () => {
  assert.deepEqual(check("code=abc&state=s1", "s1"), { code: "abc" });
  assert.deepEqual(check("code=abc&state=s1", "s2"), { status: "expired" });
  assert.deepEqual(check("code=abc&state=s1"), { status: "expired" });
  assert.deepEqual(check("code=abc", "s1"), { status: "expired" });
  assert.deepEqual(check("state=s1", "s1"), { status: "failed" });
});

await test("linked-role callback reports Discord errors before checking state", () => {
  assert.deepEqual(check("error=access_denied&state=s1"), {
    status: "cancelled",
  });
  assert.deepEqual(check("error=server_error&state=s1", "s1"), {
    status: "failed",
  });
});

await test("linked-role result URLs stay on the request origin", () => {
  assert.equal(
    getLinkedRoleResultUrl(
      "cancelled",
      "https://soulfiremc.com/api/discord/linked-role/callback?error=access_denied",
    ),
    "https://soulfiremc.com/discord/linked-role?status=cancelled",
  );
});

await test("linked-role usernames fit Discord's 100 character limit", () => {
  assert.equal(getLinkedRolePlatformUsername("Steve"), "Steve");
  const long = getLinkedRolePlatformUsername("🔥".repeat(150));
  assert.equal(Array.from(long).length, 100);
  assert.equal(long, "🔥".repeat(100));
});

await test("linked-role authorization needs a Discord client ID", () => {
  assert.equal(getLinkedRoleAuthorizeUrl(undefined, "s1"), undefined);
  assert.equal(getLinkedRoleAuthorizeUrl("", "s1"), undefined);
  const url = new URL(getLinkedRoleAuthorizeUrl("123", "s1") ?? "");
  assert.equal(
    url.origin + url.pathname,
    "https://discord.com/oauth2/authorize",
  );
  assert.equal(url.searchParams.get("client_id"), "123");
  assert.equal(url.searchParams.get("state"), "s1");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://soulfiremc.com/api/discord/linked-role/callback",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { getClientReleaseManifest, getServerVersion } from "@/lib/releases";

await test("release requests retry transient failures and validate the manifest", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    if (calls === 1) return new Response(null, { status: 503 });
    return Response.json({
      version: "2.10.2",
      pub_date: "2026-11-01",
      notes: "Extra metadata",
    });
  });

  assert.deepEqual(await getClientReleaseManifest(), {
    version: "2.10.2",
    pub_date: "2026-11-01",
  });
  assert.equal(calls, 2);
});

await test("malformed release data fails without retrying", async (t) => {
  for (const payload of [
    {},
    { version: 123 },
    { version: "  " },
    { version: "2.10.2", pub_date: 123 },
  ]) {
    const fetch = t.mock.method(globalThis, "fetch", async () =>
      Response.json(payload),
    );
    await assert.rejects(getClientReleaseManifest(), { reason: "decode" });
    assert.equal(fetch.mock.callCount(), 1);
    fetch.mock.restore();
  }
});

await test("release requests preserve permanent HTTP errors and bound transient retries", async (t) => {
  for (const [status, expectedCalls] of [
    [404, 1],
    [429, 1],
    [503, 3],
  ]) {
    const fetch = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response(null, { status }),
    );
    await assert.rejects(getClientReleaseManifest(), {
      reason: "status",
      status,
    });
    assert.equal(fetch.mock.callCount(), expectedCalls);
    fetch.mock.restore();
  }
});

await test("server versions trim whitespace and preserve the empty-file fallback", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(" 2.10.2\n"),
  );
  assert.equal(await getServerVersion(), "2.10.2");
  fetch.mock.mockImplementation(async () => new Response("\n"));
  assert.equal(await getServerVersion(), undefined);
});

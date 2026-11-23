import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { createElement } from "react";
import { makeWebsiteMailer } from "@/lib/resend";
import { decodeJsonRecord } from "./support/json";

const email = {
  from: "SoulFire <auth@transactional.soulfiremc.com>",
  to: "player@example.com",
  replyTo: "support@soulfiremc.com",
  subject: "Verify your email",
  react: createElement("p", null, "Your code is 123456"),
};

await test("emails are posted to Resend once with HTML, text, and reply-to", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({ id: "email-1" })),
  );
  await Effect.runPromise(makeWebsiteMailer().send(email));
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, init] = fetchMock.mock.calls[0]?.arguments ?? [];
  assert.equal(url, "https://api.resend.com/emails");
  assert.ok(init?.signal instanceof AbortSignal);
  assert.equal(typeof init.body, "string");
  const body = decodeJsonRecord(init.body);
  assert.equal(body["reply_to"], email.replyTo);
  assert.match(String(body["html"]), /123456/u);
  assert.match(String(body["text"]), /123456/u);
});

await test("a Resend rejection and a transport failure both fail without a retry", async (t) => {
  const rejected = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({ message: "invalid" }, { status: 422 })),
  );
  await assert.rejects(Effect.runPromise(makeWebsiteMailer().send(email)), {
    _tag: "EmailDeliveryError",
    reason: "rejected",
  });
  assert.equal(rejected.mock.callCount(), 1);
  rejected.mock.restore();

  const offline = t.mock.method(globalThis, "fetch", () =>
    Promise.reject(new TypeError("network down")),
  );
  await assert.rejects(Effect.runPromise(makeWebsiteMailer().send(email)), {
    _tag: "EmailDeliveryError",
    reason: "transport",
  });
  assert.equal(offline.mock.callCount(), 1);
});

await test("a template that fails to render is a prepare failure and is never submitted", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({ id: "email-1" })),
  );
  // Fails only on the second render, so either the HTML or the plain-text
  // render can be the one that fails.
  let renders = 0;
  function FlakyTemplate() {
    renders++;
    if (renders > 1) throw new Error("missing template data");
    return createElement("p", null, "Hello");
  }
  await assert.rejects(
    Effect.runPromise(
      makeWebsiteMailer().send({
        ...email,
        react: createElement(FlakyTemplate),
      }),
    ),
    { _tag: "EmailDeliveryError", reason: "prepare" },
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

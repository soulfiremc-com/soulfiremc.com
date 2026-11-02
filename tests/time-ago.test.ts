import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { CustomTimeAgo } from "../src/components/time-ago";

test("review dates have the same initial text in server and browser time zones", () => {
  const previousTimeZone = process.env.TZ;
  try {
    const render = () =>
      renderToString(
        createElement(CustomTimeAgo, { date: "2026-11-02T00:30:00Z" }),
      );
    process.env.TZ = "UTC";
    const serverHtml = render();
    for (const timeZone of [
      "America/Los_Angeles",
      "Europe/Berlin",
      "Asia/Tokyo",
    ]) {
      process.env.TZ = timeZone;
      assert.equal(render(), serverHtml);
    }
    assert.ok(serverHtml.includes('dateTime="2026-11-02T00:30:00.000Z"'));
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
});

test("invalid review dates do not render a broken time element", () => {
  assert.equal(
    renderToString(createElement(CustomTimeAgo, { date: "invalid" })),
    "",
  );
});

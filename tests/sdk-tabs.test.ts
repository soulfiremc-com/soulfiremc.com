import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Tab, Tabs } from "../src/components/mdx/sdk-tabs";

test("selects the default tab when its label has several words", () => {
  const html = renderToString(
    createElement(
      Tabs,
      { items: ["Self Hosted Server", "Cloud"], groupId: "test-hosting" },
      createElement(Tab, { value: "Self Hosted Server" }, "Local steps"),
      createElement(Tab, { value: "Cloud" }, "Cloud steps"),
    ),
  );

  const selected = html.match(/<button[^>]*aria-selected="true"[^>]*>(.*?)</u);
  assert.equal(selected?.[1], "Self Hosted Server");
  assert.match(html, /Local steps/u);
});

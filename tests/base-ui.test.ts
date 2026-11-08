import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Slider } from "../src/components/ui/slider";
import { Button } from "../src/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "../src/components/ui/select";

test("select resolves the human label without mounting its popup", () => {
  const html = renderToStaticMarkup(
    createElement(Select, {
      items: [{ value: "createdAt:desc", label: "Newest" }],
      defaultValue: "createdAt:desc",
      children: createElement(SelectTrigger, {
        children: createElement(SelectValue),
      }),
    }),
  );
  assert.ok(html.includes("Newest"));
  assert.ok(!html.includes('role="option"'));
});

test("link buttons retain their content and semantic element", () => {
  const html = renderToStaticMarkup(
    createElement(Button, {
      render: createElement("a", { href: "/download" }),
      nativeButton: false,
      children: "Download",
    }),
  );
  assert.ok(html.includes('href="/download"'));
  assert.ok(html.includes("Download"));
  assert.ok(!html.includes("<button"));
});

test("slider renders one thumb for a scalar and two for a range", () => {
  for (const [value, expectedCount] of [
    [42, 1],
    [[10, 20], 2],
  ] as const) {
    const html = renderToStaticMarkup(createElement(Slider, { value }));
    assert.equal(
      (html.match(/<input\b[^>]*type="range"/g) ?? []).length,
      expectedCount,
    );
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { usePrerenderedSearch } from "../src/hooks/use-prerendered-search";

test("query-dependent content matches the default static page before hydration", () => {
  const defaults = {
    category: undefined as string | undefined,
    sort: "default",
    badges: [] as string[],
  };
  function Listing({ search }: { search: typeof defaults }) {
    const value = usePrerenderedSearch(search, defaults);
    return createElement("main", null, JSON.stringify(value));
  }
  const staticHtml = renderToString(
    createElement(Listing, { search: defaults }),
  );
  const queriedHtml = renderToString(
    createElement(Listing, {
      search: {
        category: "nfa-accounts",
        sort: "best-rated",
        badges: ["budget-friendly"],
      },
    }),
  );
  assert.equal(queriedHtml, staticHtml);
  assert.ok(queriedHtml.includes("default"));
});

test("explicit download selections preserve the prerendered initial markup", () => {
  function Download() {
    const value = usePrerenderedSearch(
      { os: "linux", cpu: "arm64" },
      { os: "windows", cpu: "x64" },
    );
    return createElement(
      "a",
      { href: `/${value.os}/${value.cpu}` },
      "Download",
    );
  }
  assert.equal(
    renderToString(createElement(Download)),
    '<a href="/windows/x64">Download</a>',
  );
});

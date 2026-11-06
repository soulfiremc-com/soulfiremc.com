import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useHydratedQueryResult } from "@/hooks/use-hydrated-query-result";

function Page({ data, isPending }: { data?: string; isPending: boolean }) {
  const query = useHydratedQueryResult({ data, isPending });
  return createElement(
    "main",
    null,
    createElement("h1", null, "Downloads"),
    query.isPending
      ? createElement("span", { role: "status" }, "Loading release")
      : createElement("a", { href: query.data }, "Download"),
  );
}

await test("streamed results that resolve before hydration retain the server loading markup", () => {
  const pendingHtml = renderToString(createElement(Page, { isPending: true }));
  const earlyResultHtml = renderToString(
    createElement(Page, { isPending: false, data: "/installer.exe" }),
  );
  assert.equal(earlyResultHtml, pendingHtml);
  assert.ok(pendingHtml.includes("<h1>Downloads</h1>"));
  assert.ok(pendingHtml.includes('role="status"'));
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getSidebarBreadcrumbs,
  withoutNavigationSections,
} from "../src/lib/docs/search";

test("search skips link lists that only point to other pages", () => {
  const result = withoutNavigationSections({
    headings: [
      { id: "import-proxies", content: "Import proxies" },
      { id: "related-pages", content: "Related pages" },
      { id: "next-steps", content: "Next steps" },
    ],
    contents: [
      { heading: "import-proxies", content: "Add one proxy per line." },
      { heading: "related-pages", content: "Install plugins" },
      { heading: "next-steps", content: "Connect your first bot" },
    ],
  });

  assert.deepEqual(
    result.contents.map((item) => item.content),
    ["Add one proxy per line."],
  );
  assert.equal(result.headings.length, 3);
});

test("search breadcrumbs follow the localized sidebar folders", () => {
  const result = getSidebarBreadcrumbs({
    name: "Docs",
    children: [
      {
        type: "folder",
        name: "Dokumentation",
        root: true,
        index: { type: "page", name: "Übersicht", url: "/de/docs" },
        children: [
          {
            type: "folder",
            name: "Benutzerhandbuch",
            index: { type: "page", name: "Nutzen", url: "/de/docs/how-to" },
            children: [
              {
                type: "page",
                name: "Proxys importieren",
                url: "/de/docs/how-to/import-proxies",
              },
              { type: "separator", name: "Instance Service" },
              {
                type: "page",
                name: "Add instance proxy",
                url: "/de/docs/openapi/addInstanceProxy",
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(result.get("/de/docs"), []);
  assert.deepEqual(result.get("/de/docs/how-to"), ["Dokumentation"]);
  assert.deepEqual(result.get("/de/docs/how-to/import-proxies"), [
    "Dokumentation",
    "Benutzerhandbuch",
  ]);
  assert.deepEqual(result.get("/de/docs/openapi/addInstanceProxy"), [
    "Dokumentation",
    "Benutzerhandbuch",
    "Instance Service",
  ]);
});

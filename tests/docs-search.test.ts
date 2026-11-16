import assert from "node:assert/strict";
import { test } from "node:test";
import { withoutNavigationSections } from "../src/lib/docs/search";

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

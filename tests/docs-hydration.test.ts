import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  preloadDocsContentForHydration,
  setDocsContentPreloader,
} from "../src/lib/docs/hydration";

function rootWithPath(path: string | null) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double implements only the members this test uses
  return {
    querySelector: (selector: string) => {
      assert.equal(selector, "[data-docs-content-path]");
      return path === null ? null : { getAttribute: () => path };
    },
  } as unknown as ParentNode;
}

void test("hydration preloads the server-rendered docs page", async () => {
  const loaded: string[] = [];
  setDocsContentPreloader(async (path) => loaded.push(path));

  await preloadDocsContentForHydration(rootWithPath("how-to/commands.mdx"));
  await preloadDocsContentForHydration(rootWithPath(null));

  assert.deepEqual(loaded, ["how-to/commands.mdx"]);
});

void test("a failed preload does not block hydration", async () => {
  setDocsContentPreloader(() => Promise.reject(new Error("chunk failed")));

  await preloadDocsContentForHydration(rootWithPath("start-here/index.mdx"));
});

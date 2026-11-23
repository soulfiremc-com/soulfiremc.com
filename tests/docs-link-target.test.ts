import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { docsLinkTarget } from "../src/lib/docs/link-target";

function createDocsRouter() {
  const root = createRootRoute();
  const lang = createRoute({ getParentRoute: () => root, path: "{-$lang}" });
  const docs = createRoute({ getParentRoute: () => lang, path: "docs/$" });
  return createRouter({
    routeTree: root.addChildren([lang.addChildren([docs])]),
    history: createMemoryHistory({ initialEntries: ["/docs"] }),
  });
}

void test("docs links with a fragment target the page, not a path with #", () => {
  const router = createDocsRouter();
  const location = router.buildLocation(
    docsLinkTarget("/docs/troubleshooting#collect-a-useful-report", "de"),
  );

  assert.equal(location.pathname, "/de/docs/troubleshooting");
  assert.equal(location.hash, "collect-a-useful-report");
  assert.equal(
    location.href,
    "/de/docs/troubleshooting#collect-a-useful-report",
  );
  const [, params, route] = router.getMatchedRoutes(location.pathname);
  assert.equal(route?.id, "/{-$lang}/docs/$");
  assert.equal(params["_splat"], "troubleshooting");
});

void test("docs links without a fragment keep the localized path", () => {
  assert.deepEqual(docsLinkTarget("/docs/server/docker", "en"), {
    to: "/docs/server/docker",
    hash: undefined,
  });
});

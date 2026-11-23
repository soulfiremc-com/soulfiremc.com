import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isRedirect,
  RouterProvider,
  type ParsedLocation,
} from "@tanstack/react-router";
import { LocaleLink } from "@/components/locale-link";
import { LocaleProvider } from "@/components/locale-provider";
import { Route as LangRoute } from "@/routes/{-$lang}/route";

function parse(href: string): ParsedLocation {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: [href] }),
  });
  return router.parseLocation(router.history.location);
}

function englishRedirect(href: string) {
  const beforeLoad = LangRoute.options.beforeLoad;
  assert.ok(beforeLoad);
  let target: string | null = null;
  assert.throws(
    () => {
      beforeLoad(
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- beforeLoad reads only params and location
        {
          params: { lang: "en" },
          location: parse(href),
        } as unknown as Parameters<typeof beforeLoad>[0],
      );
    },
    (error) => {
      assert.ok(isRedirect(error));
      assert.equal(error.status, 308);
      target = error.headers.get("Location");
      return true;
    },
  );
  return target;
}

void test("/en URLs redirect to the unprefixed URL with an encoded path, query and fragment", () => {
  assert.equal(englishRedirect("/en"), "/");
  assert.equal(
    englishRedirect("/en/download?os=linux#build"),
    "/download?os=linux#build",
  );
  // A decoded non-ASCII path cannot go in a Location header.
  assert.equal(
    englishRedirect("/en/docs/%D0%BF%D1%80%D0%B8"),
    "/docs/%D0%BF%D1%80%D0%B8",
  );
  // A decoded %3F would turn part of the path into a query string.
  assert.equal(englishRedirect("/en/docs/a%3Fb"), "/docs/a%3Fb");
});

async function renderLinks(hrefs: string[]) {
  const root = createRootRoute({
    component: () =>
      createElement(LocaleProvider, {
        locale: "de",
        // oxlint-disable-next-line react/no-children-prop -- LocaleProvider types children as a required prop, which createElement's child arguments do not satisfy
        children: hrefs.map((href) =>
          createElement(LocaleLink, { key: href, href }, href),
        ),
      }),
  });
  const page = createRoute({ getParentRoute: () => root, path: "/$" });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({
      initialEntries: ["/de/docs/troubleshooting"],
    }),
  });
  await router.load();
  const html = renderToString(createElement(RouterProvider, { router }));
  return [...html.matchAll(/<a ([^>]*)>/gu)].map((match) => ({
    href: /href="([^"]*)"/u.exec(match[1] ?? "")?.[1],
    active: (match[1] ?? "").includes('data-status="active"'),
  }));
}

void test("locale links route by path and keep queries and fragments", async () => {
  assert.deepEqual(
    await renderLinks([
      "/docs/troubleshooting#collect-a-useful-report",
      "/docs/troubleshooting?tab=linux",
      "#cli-flags",
      "/blog",
    ]),
    [
      {
        href: "/de/docs/troubleshooting#collect-a-useful-report",
        active: true,
      },
      { href: "/de/docs/troubleshooting?tab=linux", active: false },
      { href: "#cli-flags", active: false },
      { href: "/blog", active: false },
    ],
  );
});

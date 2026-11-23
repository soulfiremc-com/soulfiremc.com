import { strict as assert } from "node:assert";
import { test } from "node:test";
import { openapiSource } from "fumadocs-openapi/server";
import {
  formatOpenApiTagName,
  getOpenApiStructuredData,
  openapi,
} from "../src/lib/docs/openapi";

void test("OpenAPI tag names keep acronyms together", () => {
  assert.equal(formatOpenApiTagName("MCAuthService"), "MC Auth Service");
  assert.equal(formatOpenApiTagName("BotLiveService"), "Bot Live Service");
  assert.equal(formatOpenApiTagName("PovService"), "Pov Service");
  assert.equal(formatOpenApiTagName("Service"), "Service");
});

void test("OpenAPI search results link to the page, not a missing anchor", async () => {
  const source = await openapiSource(openapi, {
    baseDir: "openapi/(generated)",
    groupBy: "tag",
  });
  const page = source.files.find(
    (file) =>
      file.type === "page" &&
      file.path.endsWith("/botliveservice/acquireBotControl.mdx"),
  );
  assert.ok(page?.type === "page");

  const structuredData = getOpenApiStructuredData({
    data: { ...page.data, title: page.data.title ?? "" },
    slugs: ["openapi", "bot-live-service", "acquire-bot-control"],
    url: "/docs/openapi/bot-live-service/acquire-bot-control",
  });

  // The rendered API page has no element with a section ID, so a heading
  // ID here would add a fragment that scrolls nowhere.
  assert.deepEqual(structuredData.headings, []);
  assert.equal(structuredData.contents.length, 1);
  assert.equal(structuredData.contents[0]?.heading, undefined);
  assert.match(
    structuredData.contents[0]?.content ?? "",
    /^POST \/v1\/instances\/\{instance_id\}\/bots\/\{bot_id\}\/control:acquire\n\nAcquire bot control/u,
  );
});

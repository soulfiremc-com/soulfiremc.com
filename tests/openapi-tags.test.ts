import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatOpenApiTagName } from "../src/lib/docs/openapi";

void test("OpenAPI tag names keep acronyms together", () => {
  assert.equal(formatOpenApiTagName("MCAuthService"), "MC Auth Service");
  assert.equal(formatOpenApiTagName("BotLiveService"), "Bot Live Service");
  assert.equal(formatOpenApiTagName("PovService"), "Pov Service");
  assert.equal(formatOpenApiTagName("Service"), "Service");
});

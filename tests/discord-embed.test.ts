import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  createDiscordEmbed,
  discordEmbedScript,
  serializeDiscordEmbed,
} from "../src/lib/discord-embed";

test("serializes page content and navigation as safe, bounded Discord JSON", () => {
  const [script] = discordEmbedScript({
    title: "</script> New guide",
    description: "Read the latest guide",
    url: "https://example.com/guide",
    links: [{ label: "Installation", url: "https://example.com/install" }],
    images: ["https://example.com/image.png"],
  });
  assert.ok(script);
  assert.equal(script.id, "discord:component-embed");
  assert.ok(!script.children.includes("<"));
  const payload = JSON.parse(script.children);
  assert.match(payload.component.components[0].content, /New guide/);
  assert.equal(
    payload.component.components.at(-1).components[1].url,
    "https://example.com/install",
  );
  const card = createDiscordEmbed({
    title: "🌍".repeat(200),
    description: "🌍</script>".repeat(1000),
    url: "https://example.com",
    images: ["https://example.com/" + "x".repeat(1900)],
  });
  assert.ok(card);
  assert.ok(
    new TextEncoder().encode(serializeDiscordEmbed(card)).byteLength <= 3000,
  );
});

test("omits unsupported URLs instead of creating unsafe buttons", () => {
  assert.deepEqual(
    discordEmbedScript({ title: "Bad", url: "javascript:alert(1)" }),
    [],
  );
  const [script] = discordEmbedScript({
    title: "Good",
    url: "https://example.com",
    links: [{ label: "Bad", url: "file:///tmp/data" }],
  });
  assert.ok(script);
  assert.equal(
    JSON.parse(script.children).component.components.at(-1).components.length,
    1,
  );
});

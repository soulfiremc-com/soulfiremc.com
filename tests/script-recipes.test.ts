import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { Schema } from "effect";
import {
  recipeSchema,
  validateRecipe,
  type CatalogNode,
} from "../scripts/lib/script-recipes";
import { defined } from "./support/defined";
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- public/docs/node-catalog.json is generated from the server and has this shape
const catalogFile = JSON.parse(
  readFileSync("public/docs/node-catalog.json", "utf8"),
) as { nodes: CatalogNode[] };
const catalog = catalogFile.nodes;
const decodeRecipe = Schema.decodeUnknownSync(
  Schema.fromJsonString(recipeSchema),
);
const fixture = () =>
  decodeRecipe(
    readFileSync("public/docs/scripts/join-log.soulfire-script.json", "utf8"),
  );
type Edge = ReturnType<typeof fixture>["edges"][number];
const withFirstEdge = (change: Partial<Edge>) => {
  const graph = fixture();
  const [first, ...rest] = graph.edges;
  return { ...graph, edges: [{ ...defined(first), ...change }, ...rest] };
};

test("a bot event supplies execution context while a data edge satisfies an action input", () => {
  assert.doesNotThrow(() => validateRecipe(fixture(), catalog));
  const graph = fixture();
  graph.edges.pop();
  assert.throws(
    () => validateRecipe(graph, catalog),
    /Missing required input/u,
  );
});

test("graphs reject wrong port direction, missing nodes, and execution mixed with data", () => {
  for (const graph of [
    withFirstEdge({ sourceHandle: "in" }),
    withFirstEdge({ source: "missing" }),
    withFirstEdge({ sourceHandle: "username" }),
  ]) {
    assert.throws(() => validateRecipe(graph, catalog));
  }
});

test("imports start paused and disallow ambiguous IDs or multiple input sources", () => {
  const active = { ...fixture(), paused: false };
  assert.throws(() => validateRecipe(active, catalog));
  const duplicateNode = fixture();
  duplicateNode.nodes.push(defined(duplicateNode.nodes[0]));
  assert.throws(
    () => validateRecipe(duplicateNode, catalog),
    /Duplicate node/u,
  );
  const duplicateEdge = fixture();
  duplicateEdge.edges.push({
    ...defined(duplicateEdge.edges[0]),
    id: "another",
  });
  assert.throws(
    () => validateRecipe(duplicateEdge, catalog),
    /Multiple sources/u,
  );
});

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  validateRecipe,
  type CatalogNode,
} from "../scripts/lib/script-recipes";
const catalog = (
  JSON.parse(readFileSync("public/docs/node-catalog.json", "utf8")) as {
    nodes: CatalogNode[];
  }
).nodes;
const fixture = () =>
  JSON.parse(
    readFileSync("public/docs/scripts/join-log.soulfire-script.json", "utf8"),
  );

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
  for (const mutation of [
    (graph: ReturnType<typeof fixture>) => {
      graph.edges[0].sourceHandle = "in";
    },
    (graph: ReturnType<typeof fixture>) => {
      graph.edges[0].source = "missing";
    },
    (graph: ReturnType<typeof fixture>) => {
      graph.edges[0].sourceHandle = "username";
    },
  ]) {
    const graph = fixture();
    mutation(graph);
    assert.throws(() => validateRecipe(graph, catalog));
  }
});

test("imports start paused and disallow ambiguous IDs or multiple input sources", () => {
  const active = fixture();
  active.paused = false;
  assert.throws(() => validateRecipe(active, catalog));
  const duplicateNode = fixture();
  duplicateNode.nodes.push(duplicateNode.nodes[0]);
  assert.throws(
    () => validateRecipe(duplicateNode, catalog),
    /Duplicate node/u,
  );
  const duplicateEdge = fixture();
  duplicateEdge.edges.push({ ...duplicateEdge.edges[0], id: "another" });
  assert.throws(
    () => validateRecipe(duplicateEdge, catalog),
    /Multiple sources/u,
  );
});

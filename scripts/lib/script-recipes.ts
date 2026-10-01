import { z } from "zod";
import type { NodePort } from "./java-metadata";

export type CatalogNode = {
  type: string;
  trigger: boolean;
  inputs: NodePort[];
  outputs: NodePort[];
};
const recipeSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  description: z.string(),
  paused: z.literal(true),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.string().min(1),
        position: z.object({ x: z.number().finite(), y: z.number().finite() }),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1),
  edges: z.array(
    z.object({
      id: z.string().min(1),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string(),
      targetHandle: z.string(),
    }),
  ),
});

/** Validate the structural contract of small, acyclic documentation recipes. */
export function validateRecipe(value: unknown, catalog: CatalogNode[]) {
  const recipe = recipeSchema.parse(value);
  const nodes = new Map(recipe.nodes.map((node) => [node.id, node]));
  if (nodes.size !== recipe.nodes.length) throw new Error("Duplicate node ID");
  if (new Set(recipe.edges.map((edge) => edge.id)).size !== recipe.edges.length)
    throw new Error("Duplicate edge ID");
  const types = new Map(catalog.map((node) => [node.type, node]));
  const metadata = new Map(
    recipe.nodes.map((node) => {
      const definition = types.get(node.type);
      if (!definition) throw new Error(`Unknown node type: ${node.type}`);
      return [node.id, definition];
    }),
  );
  if (![...metadata.values()].some((node) => node.trigger))
    throw new Error("Recipe needs a trigger");
  const connections = new Set<string>();
  const adjacency = new Map<string, string[]>();
  for (const edge of recipe.edges) {
    const output = metadata
      .get(edge.source)
      ?.outputs.find((port) => port.id === edge.sourceHandle);
    const input = metadata
      .get(edge.target)
      ?.inputs.find((port) => port.id === edge.targetHandle);
    if (!output || !input)
      throw new Error(`Unknown node or port on edge ${edge.id}`);
    const key = `${edge.target}:${input.id}`;
    if (connections.has(key) && !input.multiInput)
      throw new Error(`Multiple sources for ${key}`);
    connections.add(key);
    if (
      (input.type === "exec") !== (output.type === "exec") ||
      (input.type !== output.type &&
        input.type !== "any" &&
        output.type !== "any")
    )
      throw new Error(
        `Incompatible edge ${edge.id}: ${output.type} -> ${input.type}`,
      );
    adjacency.set(edge.source, [
      ...(adjacency.get(edge.source) ?? []),
      edge.target,
    ]);
  }
  for (const node of recipe.nodes) {
    const definition = metadata.get(node.id)!;
    for (const [key, value] of Object.entries(node.data)) {
      const input = definition.inputs.find((port) => port.id === key);
      if (!input || input.type === "exec")
        throw new Error(`Unknown inline input ${node.id}:${key}`);
      if (
        (["string", "boolean", "number"].includes(input.type) &&
          typeof value !== input.type) ||
        (typeof value === "number" && !Number.isFinite(value))
      )
        throw new Error(`Invalid inline type ${node.id}:${key}`);
    }
    for (const input of definition.inputs) {
      const connected = connections.has(`${node.id}:${input.id}`);
      const configured =
        Object.hasOwn(node.data, input.id) || input.defaultValue !== undefined;
      if (input.required && !connected && !configured)
        throw new Error(`Missing required input ${node.id}:${input.id}`);
      if (input.type === "exec" && !definition.trigger && !connected)
        throw new Error(`Unreachable action ${node.id}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new Error("Documentation recipe contains a cycle");
    if (visited.has(id)) return;
    visiting.add(id);
    adjacency.get(id)?.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  recipe.nodes.forEach((node) => visit(node.id));
  return recipe;
}

/** Keep local schema references readable without expanding recursive schemas forever. */
export function referencedSchemas(
  contract: unknown,
  schemas: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const visited = new Set<object>();
  function visit(value: unknown) {
    if (typeof value !== "object" || value === null || visited.has(value))
      return;
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const object = value as Record<string, unknown>;
    const reference = object.$ref;
    if (
      typeof reference === "string" &&
      reference.startsWith("#/components/schemas/")
    ) {
      const name = decodeURIComponent(reference.slice(21))
        .replace(/~1/gu, "/")
        .replace(/~0/gu, "~");
      if (!Object.hasOwn(result, name)) {
        if (!Object.hasOwn(schemas, name))
          throw new Error(`Missing OpenAPI schema: ${name}`);
        result[name] = schemas[name];
        visit(schemas[name]);
      }
    }
    Object.values(object).forEach(visit);
  }
  visit(contract);
  return result;
}

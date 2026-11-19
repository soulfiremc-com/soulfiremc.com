import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/d1";
import * as generatedAuthSchema from "./auth-schema";
import * as schema from "./schema";

export const dbSchema = { ...generatedAuthSchema, ...schema };

const databaseStorage = new AsyncLocalStorage<{
  primary: D1DatabaseSession;
  reviews: D1DatabaseSession;
}>();

export function runWithD1Database<T>(
  binding: D1Database,
  reviewSession: D1DatabaseSession,
  callback: () => T,
): T {
  return databaseStorage.run(
    { primary: binding.withSession("first-primary"), reviews: reviewSession },
    callback,
  );
}

function createDatabase(target: "primary" | "reviews") {
  // Resolve the binding when a query runs, while keeping Drizzle's schema
  // available at module initialization for Better Auth and its CLI.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the proxy forwards every call to the request's D1 binding, so the empty target is never read
  const client = new Proxy({} as D1Database, {
    get(_target, property): unknown {
      const context = databaseStorage.getStore();
      if (!context) {
        throw new Error("Database access requires a Worker request context.");
      }
      const binding = context[target];
      const value: unknown = Reflect.get(binding, property);
      return typeof value === "function" ? value.bind(binding) : value;
    },
  });
  return drizzle(client, { schema: dbSchema });
}

export const db = createDatabase("primary");
export const reviewDb = createDatabase("reviews");

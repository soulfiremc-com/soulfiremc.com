import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/d1";
import * as generatedAuthSchema from "./auth-schema";
import * as schema from "./schema";

export const dbSchema = { ...generatedAuthSchema, ...schema };

const databaseStorage = new AsyncLocalStorage<{
  primary: D1Database;
  reviews: D1DatabaseSession;
}>();

export function runWithD1Database<T>(
  binding: D1Database,
  reviewSession: D1DatabaseSession,
  callback: () => T,
): T {
  return databaseStorage.run(
    { primary: binding, reviews: reviewSession },
    callback,
  );
}

function createDatabase(target: "primary" | "reviews") {
  // Resolve the binding when a query runs, while keeping Drizzle's schema
  // available at module initialization for Better Auth and its CLI.
  const client = new Proxy({} as D1Database, {
    get(_target, property) {
      const context = databaseStorage.getStore();
      if (!context) {
        throw new Error("Database access requires a Worker request context.");
      }
      const binding = context[target];
      const value = Reflect.get(binding, property);
      return typeof value === "function" ? value.bind(binding) : value;
    },
  });
  return drizzle(client, { schema: dbSchema });
}

export const db = createDatabase("primary");
export const reviewDb = createDatabase("reviews");

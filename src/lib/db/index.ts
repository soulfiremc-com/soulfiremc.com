import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import * as generatedAuthSchema from "./auth-schema";
import * as schema from "./schema";

const LOCAL_DATABASE_URL =
  "postgres://postgres:password@localhost:5432/soulfire";

const dbSchema = {
  ...generatedAuthSchema,
  ...schema,
};

type DbContext = {
  connectionString: string;
};

const dbContextStorage = new AsyncLocalStorage<DbContext>();
type Db = NodePgDatabase<typeof dbSchema>;
const dbCache = new Map<string, Db>();

function createDb({ connectionString }: DbContext): Db {
  return drizzle({
    connection: connectionString,
    schema: dbSchema,
  });
}

function getDbContext(): DbContext {
  return (
    dbContextStorage.getStore() ?? {
      connectionString: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
    }
  );
}

function getDb(): Db {
  const dbContext = getDbContext();
  const cacheKey = dbContext.connectionString;
  const cachedDb = dbCache.get(cacheKey);

  if (cachedDb) {
    return cachedDb;
  }

  const nextDb = createDb(dbContext);
  dbCache.set(cacheKey, nextDb);
  return nextDb;
}

export function runWithHyperdriveDatabase<T>(
  hyperdrive: Hyperdrive | undefined,
  callback: () => T,
): T {
  if (!hyperdrive) {
    return callback();
  }

  return dbContextStorage.run(
    {
      connectionString: hyperdrive.connectionString,
    },
    callback,
  );
}

export const db = new Proxy(
  {},
  {
    get(_target, property, receiver) {
      return Reflect.get(getDb() as object, property, receiver);
    },
  },
) as Db;

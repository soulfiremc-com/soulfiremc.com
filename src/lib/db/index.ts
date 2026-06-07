import { AsyncLocalStorage } from "node:async_hooks";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as generatedAuthSchema from "./auth-schema";
import * as schema from "./schema";

const LOCAL_DATABASE_URL =
  "postgres://postgres:password@localhost:5432/soulfire";

const dbSchema = {
  ...generatedAuthSchema,
  ...schema,
};

type Db = NodePgDatabase<typeof dbSchema>;

type DbContext = {
  db?: Db;
  connectionString: string;
};

const dbContextStorage = new AsyncLocalStorage<DbContext>();
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
  if (dbContext.db) {
    return dbContext.db;
  }

  const cacheKey = dbContext.connectionString;
  const cachedDb = dbCache.get(cacheKey);

  if (cachedDb) {
    return cachedDb;
  }

  const nextDb = createDb(dbContext);
  dbCache.set(cacheKey, nextDb);
  return nextDb;
}

function createLazyClient(connectionString: string): Client {
  const client = new Client({ connectionString });
  const query = client.query.bind(client);
  let connectPromise: Promise<Client> | undefined;

  function connect() {
    connectPromise ??= client.connect();
    return connectPromise;
  }

  client.query = ((...args: Parameters<Client["query"]>) =>
    connect().then(() => query(...args))) as Client["query"];

  return client;
}

export function runWithHyperdriveDatabase<T>(
  hyperdrive: Hyperdrive,
  callback: () => T | Promise<T>,
): Promise<T> | T {
  return runWithHyperdriveClient(hyperdrive, callback);
}

async function runWithHyperdriveClient<T>(
  hyperdrive: Hyperdrive,
  callback: () => T | Promise<T>,
): Promise<T> {
  const client = createLazyClient(hyperdrive.connectionString);

  return dbContextStorage.run(
    {
      connectionString: hyperdrive.connectionString,
      db: drizzle(client, { schema: dbSchema }),
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

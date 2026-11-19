// Miniflare's published types import @cloudflare/workers-types, but that
// package is only a Miniflare dev dependency. Resolve the D1 binding type the
// tests use to the generated Worker types instead of an error type.
type WorkerD1Database = D1Database;

declare module "@cloudflare/workers-types/experimental" {
  export type D1Database = WorkerD1Database;
}

# soulfiremc.com

The SoulFire website and documentation run on Cloudflare Workers with TanStack Start and D1.

## Local development

```bash
bun install
bun run db:migrate
bun dev
```

Wrangler stores the local D1 database in `.wrangler/state`. Local development does not require Postgres or Hyperdrive.

## Database migrations

Generate the Better Auth schema after changing auth plugins or upgrading Better Auth:

```bash
bun run scripts/generate-auth-schema.ts
```

Update the pinned auth CLI version in that script when upgrading Better Auth.

After changing a schema, generate a named migration:

```bash
bunx drizzle-kit generate --name <migration-name>
bun run db:migrate
```

Commit the generated SQL and metadata exactly as Drizzle produces them. D1 migrations live in `drizzle-d1/`.
The original `drizzle/` directory preserves the Postgres migration history and is not applied to D1.

Apply remote migrations with:

```bash
bun run db:migrate:remote
```

The migration workflow runs this command on pushes to `main`.
Set the repository secret `CLOUDFLARE_API_TOKEN` to a token with D1 Edit permission for the configured account.
Apply migrations before deploying code that requires them.

## Read replication

The `DB` binding points to `soulfire-website`. Read replication is enabled in that database's Cloudflare configuration.
For a replacement database, enable **Settings > Enable Read Replication** in the Cloudflare dashboard.

Authentication, user-specific reviews, and permission checks use the primary database through `db`.
Public review queries use `reviewDb`, which resolves to a D1 session for each request.

Read requests start from the bookmark cookie, or use `first-unconstrained` when no bookmark exists.
Review mutations start with `first-primary` and return an HttpOnly bookmark cookie.
The next read uses that bookmark so it includes the completed write. Read responses do not overwrite bookmark cookies.

Replicas can lag behind other users' changes. A bookmark guarantees visibility of preceding writes in that session, not all global writes.
Better Auth's existing five-minute session cookie cache remains a separate cache.

See [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/) for the consistency model.

## Move existing Postgres data to D1

This is a one-time cutover procedure for the site operator. The application rewrite does not move existing records automatically.

1. Pause production writes, including auth endpoints, and take a Postgres backup.
2. Apply the D1 schema to an empty target database with `bun run db:migrate:remote`.
3. Set `DATABASE_URL` in your environment to the source Postgres connection.
4. Export a consistent snapshot:

   ```bash
   bun scripts/export-postgres-to-d1.ts
   ```

   The script creates `.local/postgres-to-d1.sql` with owner-only permissions and prints table counts.
   It preserves IDs, password hashes, encrypted tokens, passkeys, and sessions. UTC timestamps become Unix milliseconds.
   The source remains read-only. The script refuses to overwrite an existing export.

5. Set `CLOUDFLARE_API_TOKEN` with D1 Edit permission, then import into the empty D1 database:

   ```bash
   bun scripts/import-postgres-to-d1.ts .local/postgres-to-d1.sql
   ```

   The importer uses bound parameters for large values and verifies every column against the snapshot.
   It rejects targets that already contain records. Use `--verify-only` to rerun the comparison without writing.

   The export contains authentication secrets. Keep it private and delete it after the cutover checks.
   Do not retry a failed import against partially imported tables. Restore an empty target before retrying.

6. Compare target table counts with the export counts and run `PRAGMA foreign_key_check` on D1.
7. Keep the existing `BETTER_AUTH_SECRET`, provider credentials, and application secrets during deployment.
8. Build and deploy the Worker:

   ```bash
   bun run deploy
   ```

9. Check login, logout, OTP, two-factor authentication, passkeys, review submission, and moderation before resuming traffic.

Keep the Postgres backup and previous Worker version until the cutover checks pass.
If D1 receives new production writes, switching back to Postgres requires reconciling those writes first.

## Validation

```bash
bun run typecheck
bun run test
bun run build
```

The D1 tests run with Miniflare and do not use the remote database.

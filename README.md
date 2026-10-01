# soulfiremc.com

The SoulFire website and documentation run on Cloudflare Workers with TanStack Start and D1.

## Local development

```bash
bun install
bun run db:migrate
bun dev
```

The Cloudflare development server stores the local D1 database in `.wrangler/state`.

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

Authentication, user-specific reviews, and permission checks use a separate `first-primary` session through `db` for each request.
Its first query reaches the primary; subsequent reads can use replicas with sequential consistency. All writes still reach the primary.
Public review queries use `reviewDb`, which resolves to a D1 session for each request.

Read requests start from the bookmark cookie, or use `first-unconstrained` when no bookmark exists.
Review mutations start with `first-primary` and return an HttpOnly bookmark cookie.
The next read uses that bookmark so it includes the completed write. Read responses do not overwrite bookmark cookies.

Replicas can lag behind other users' changes. A bookmark guarantees visibility of preceding writes in that session, not all global writes.
Better Auth's existing five-minute session cookie cache remains a separate cache.

See [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/) for the consistency model.

## Documentation

Documentation lives in `content/docs`, with downloadable recipes and images in
`public/docs`. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the writing workflow,
source baseline, and example checks.

Reference generators use the SoulFire revision pinned in `scripts/sdk-source.ts`.
They cache that checkout in the system's temporary directory. Documentation checks
require Bun, Git, Python 3.14, and Java 25. Gradle downloads the backend's build
dependencies on the first run.

```bash
bun run generate-node-reference
bun run generate-sdk-reference
bun run check-docs
```

Set `SOULFIRE_SDK_SOURCE` to reuse a local checkout at the pinned revision.
The generators check its revision before using it.

## Validation

```bash
bun run check
bun run check-docs
bun run typecheck
bun run test
bun run build
```

The D1 tests run with Miniflare and do not use the remote database.

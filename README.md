# soulfiremc.com
The code for our website and documentation!

## Generate better-auth schema

```bash
bun run scripts/generate-auth-schema.ts
```

## Drizzle

https://orm.drizzle.team/docs/kit-overview

### Create migration

```bash
bunx drizzle-kit generate --name=<name>
```

### Run migrations

```bash
bunx drizzle-kit migrate
```

### Push schema to db

```bash
bunx drizzle-kit push
```

### Open Studio

URL: https://local.drizzle.studio

```bash
bunx drizzle-kit studio
```

<p align="center">
  <a rel="noopener noreferrer" target="_blank" href="https://vercel.com/?utm_source=soulfire&utm_campaign=oss">
    <img height="34px" src="/public/assets/powered-by-vercel.svg" alt="Powered by vercel">
  </a>
</p>

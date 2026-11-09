import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";

const workerBundle = process.env.PROVIDER_WORKER_BUNDLE;

// Run against the actual production Worker, without prerendered HTML or live
// provider services. Ordinary Node tests cannot enforce Worker I/O ownership.
void test(
  "concurrent provider pages finish with cold Discord caches in the Workers runtime",
  {
    skip: !workerBundle,
    timeout: 60_000,
  },
  async () => {
    const bundle = resolve(workerBundle!);
    const config = JSON.parse(
      await readFile(join(bundle, "../worker.config.json"), "utf8"),
    ) as {
      compatibilityDate: string;
      compatibilityFlags: string[];
      env: Record<string, { type: string; value?: string }>;
    };
    const modules = [
      { type: "ESModule" as const, path: join(bundle, "index.js") },
      ...(await readdir(bundle, { recursive: true }))
        .filter((path) => path !== "index.js" && /\.(js|wasm)$/.test(path))
        .map((path) => ({
          type: path.endsWith(".wasm")
            ? ("CompiledWasm" as const)
            : ("ESModule" as const),
          path: join(bundle, path),
        })),
    ];
    const mf = new Miniflare(
      convertV4MiniflareOptions({
        workers: [
          {
            name: "provider-regression",
            modules,
            modulesRoot: bundle,
            compatibilityDate: config.compatibilityDate,
            compatibilityFlags: config.compatibilityFlags,
            d1Databases: { DB: "provider-regression" },
            bindings: Object.fromEntries(
              Object.entries(config.env)
                .filter(([, value]) => value.type === "text")
                .map(([key, value]) => [key, value.value ?? ""]),
            ),
            outboundService: async (request) => {
              const url = new URL(request.url);
              if (
                url.hostname === "discord.com" &&
                url.pathname.includes("/invites/")
              )
                return Response.json({
                  code: "regression",
                  guild: {
                    id: "1",
                    name: "Test guild",
                    icon: null,
                    description: null,
                  },
                  approximate_member_count: 12345,
                  approximate_presence_count: 123,
                });
              if (url.hostname === "localts.store")
                return Response.json({
                  products: [{ name: "MFA", stock: 12 }],
                });
              if (url.hostname === "api.ravealts.com") return Response.json({});
              return new Response(null, {
                status: 302,
                headers: { location: "https://discord.gg/regression" },
              });
            },
          },
        ],
      }),
    );
    try {
      await mf.ready;
      for (const phase of ["cold", "warm"]) {
        await Promise.all(
          [
            "/get-accounts",
            "/de/get-accounts",
            "/pl/get-accounts",
            "/ru/get-accounts",
          ].map(async (path) => {
            const response = await mf.dispatchFetch(
              `https://soulfiremc.com${path}`,
            );
            const html = await response.text();
            assert.equal(
              response.status,
              200,
              `${phase}: ${path}: ${html.slice(0, 500)}`,
            );
            assert.ok(html.includes("Localts"), `${phase}: ${path}`);
          }),
        );
      }
    } finally {
      await mf.dispose();
    }
  },
);

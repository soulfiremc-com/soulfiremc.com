import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { locales, localizePath } from "@/lib/i18n";
import { translate } from "@/lib/messages";
import en from "@/lib/messages/en.json";

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

      // Exercise SSR, not prerendered files, so dynamic catalog values and head
      // metadata must resolve correctly in the deployed runtime too.
      for (const locale of locales) {
        await Promise.all(
          (
            [
              ["/", "home.meta.title"],
              ["/download", "download.downloadSoulfireSoulfire"],
              ["/pricing", "support.meta.title"],
              ["/get-accounts", "providers.accounts.meta.title"],
              ["/get-proxies", "providers.proxies.meta.title"],
              ["/get-accounts/localts", null],
              ["/get-proxies/webshare", null],
            ] as const
          ).map(async ([path, titleKey]) => {
            const localizedPath = localizePath(path, locale);
            const response = await mf.dispatchFetch(
              `https://soulfiremc.com${localizedPath}`,
            );
            const html = await response.text();
            assert.equal(response.status, 200, localizedPath);
            if (titleKey) {
              const title = translate(locale, titleKey);
              assert.ok(
                html.includes(
                  `<title>${title.replaceAll("&", "&amp;")}</title>`,
                ),
                `${localizedPath}: translated page title`,
              );
            }
            const document = html.replace(
              /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
              "",
            );
            for (const key of Object.keys(en)) {
              assert.ok(
                !document.includes(key),
                `${localizedPath}: unresolved visible message ${key}`,
              );
            }
            for (const [, json] of html.matchAll(
              /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
            )) {
              const structuredData = JSON.parse(json);
              const values: string[] = [];
              JSON.stringify(structuredData, (_, value) => {
                if (typeof value === "string") values.push(value);
                return value;
              });
              for (const value of values) {
                assert.ok(
                  !Object.keys(en).some((key) => value.includes(key)),
                  `${localizedPath}: unresolved structured message ${value}`,
                );
              }
            }
          }),
        );
      }
    } finally {
      await mf.dispose();
    }
  },
);

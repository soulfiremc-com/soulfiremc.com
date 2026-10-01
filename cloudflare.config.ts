import * as entrypoint from "./src/server.ts" with { type: "cf-worker" };
import { bindings, defineConfig } from "cf/config";
export default defineConfig({
  accountId: "4dd0e72d7bf89402be905fb40cdb230a",
  worker: {
    name: "soulfire-website",
    compatibilityDate: "2026-04-13",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint,
    observability: {
      enabled: true,
      logs: {
        enabled: true,
        headSamplingRate: 1,
        invocationLogs: true,
      },
      traces: {
        enabled: true,
        headSamplingRate: 0.05,
      },
    },
    assets: {
      htmlHandling: "drop-trailing-slash",
    },
    env: {
      DISCORD_BOT_TOKEN: bindings.secret(),
      DB: bindings.d1({
        name: "soulfire-website",
        id: "68aff6f2-3d21-48bd-b24e-7286f6e0b5a4",
      }),
    },
  },
});

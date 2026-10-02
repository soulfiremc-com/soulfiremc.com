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
      issues: {
        enabled: true,
      },
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
      BETTER_AUTH_URL: bindings.text("https://soulfiremc.com"),
      GOOGLE_CLIENT_ID: bindings.text(
        "752435735851-bec2rdqc2h4i2jpq90f9cmst0ii24hi7.apps.googleusercontent.com",
      ),
      DISCORD_CLIENT_ID: bindings.text("1248603974475583608"),
      GITHUB_CLIENT_ID: bindings.text("Ov23livPhrJP9E6LIDJA"),
      BETTER_AUTH_API_KEY: bindings.secret(),
      BETTER_AUTH_SECRET: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      DISCORD_CLIENT_SECRET: bindings.secret(),
      GITHUB_CLIENT_SECRET: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      TURNSTILE_SECRET_KEY: bindings.secret(),
      REVIEW_TURNSTILE_SECRET_KEY: bindings.secret(),
      DISCORD_BOT_TOKEN: bindings.secret(),
      DB: bindings.d1({
        name: "soulfire-website",
        id: "68aff6f2-3d21-48bd-b24e-7286f6e0b5a4",
      }),
    },
  },
});

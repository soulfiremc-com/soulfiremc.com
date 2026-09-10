import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-d1",
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/auth-schema.ts"],
  dialect: "sqlite",
  verbose: true,
  strict: true,
});

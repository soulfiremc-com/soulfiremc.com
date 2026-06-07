import handler from "@tanstack/react-start/server-entry";
import { runWithHyperdriveDatabase } from "@/lib/db";

const securityHeaders = [
  ["X-DNS-Prefetch-Control", "on"],
  ["X-XSS-Protection", "0"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["X-Content-Type-Options", "nosniff"],
] as const;

export default {
  fetch: async (
    request: Request,
    env: CloudflareEnv,
    _ctx: ExecutionContext,
  ) => {
    const response = await runWithHyperdriveDatabase(env.HYPERDRIVE, () =>
      handler.fetch(request),
    );

    for (const [key, value] of securityHeaders) {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    }

    return response;
  },
};

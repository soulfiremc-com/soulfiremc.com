import handler from "@tanstack/react-start/server-entry";
import { runWithD1Database } from "@/lib/db";
import { createReviewSession, setReviewBookmark } from "@/lib/db/replication";

const securityHeaders = [
  ["X-DNS-Prefetch-Control", "on"],
  ["X-XSS-Protection", "0"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["X-Content-Type-Options", "nosniff"],
] as const;

export default {
  fetch: async (request: Request, env: CloudflareEnv) => {
    const reviewSession = createReviewSession(env.DB, request);
    const originalResponse = await runWithD1Database(
      env.DB,
      reviewSession,
      () => handler.fetch(request),
    );
    const response = new Response(originalResponse.body, originalResponse);
    setReviewBookmark(request, response, reviewSession);

    for (const [key, value] of securityHeaders) {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    }

    return response;
  },
};

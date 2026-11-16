import handler from "@tanstack/react-start/server-entry";
import { runWithD1Database } from "@/lib/db";
import { createReviewSession, setReviewBookmark } from "@/lib/db/replication";
import { runWithDiscordLookupScope } from "@/lib/discord";

// Keep in sync with the `/*` block in public/_headers, which covers
// prerendered pages and other static assets that skip this Worker.
const securityHeaders = [
  ["X-DNS-Prefetch-Control", "on"],
  ["X-XSS-Protection", "0"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["X-Content-Type-Options", "nosniff"],
  [
    "Content-Security-Policy",
    "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests",
  ],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), usb=(), serial=(), hid=(), browsing-topics=()",
  ],
  ["Cross-Origin-Opener-Policy", "same-origin-allow-popups"],
] as const;

export default {
  fetch: async (request: Request, env: Cloudflare.Env) => {
    const reviewSession = createReviewSession(env.DB, request);
    const originalResponse = await runWithD1Database(
      env.DB,
      reviewSession,
      () => runWithDiscordLookupScope(() => handler.fetch(request)),
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

import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { AUTH_UI_BASE_PATHS, AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";

// Better Auth sends OAuth failures, such as a cancelled social sign-in, to its
// own unstyled error page. Show the site's auth error view with the same query.
function redirectBetterAuthErrorPage(request: Request): Response | undefined {
  const url = new URL(request.url);
  if (url.pathname.replace(/\/+$/u, "") !== "/api/auth/error") return undefined;
  const target = new URL(
    `${AUTH_UI_BASE_PATHS.auth}/${AUTH_UI_VIEW_PATHS.auth.error}`,
    url,
  );
  target.search = url.search;
  return Response.redirect(target.toString(), 302);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        redirectBetterAuthErrorPage(request) ?? auth.handler(request),
      POST: async ({ request }) => auth.handler(request),
    },
  },
});

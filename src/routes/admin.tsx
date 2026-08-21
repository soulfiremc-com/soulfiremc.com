import { ensureSession } from "@better-auth-ui/core";
import { ensureSessionServer } from "@better-auth-ui/core/server";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { SiteShell } from "@/components/site-shell";
import { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";

export const Route = createFileRoute("/admin")({
  async beforeLoad({ context: { queryClient }, location }) {
    const getSession = createIsomorphicFn()
      .server(() =>
        ensureSessionServer(queryClient, auth, {
          headers: getRequestHeaders(),
        }),
      )
      .client(() => ensureSession(queryClient, authClient));
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: "/auth/$path",
        params: { path: AUTH_UI_VIEW_PATHS.auth.signIn },
        search: { redirectTo: location.href },
      });
    }

    return { session };
  },
  head: () => ({
    meta: [
      { title: "Administration - SoulFire" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-(--fd-layout-width) p-4 md:p-6">
        <Outlet />
      </main>
    </SiteShell>
  );
}

import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";
import { hasAdminRole } from "@/lib/auth/roles";
import { ensureRouteSession } from "@/lib/route-session";

export const Route = createFileRoute("/admin")({
  async beforeLoad({ context: { queryClient }, location }) {
    const session = await ensureRouteSession({ queryClient });

    if (!session) {
      throw redirect({
        to: "/auth/$path",
        params: { path: AUTH_UI_VIEW_PATHS.auth.signIn },
        search: { redirectTo: location.href },
      });
    }

    // The server checks every admin request. This only keeps other users
    // (including an admin who is impersonating someone) out of the shell.
    // The client session type does not include admin plugin fields.
    const role = "role" in session.user ? session.user.role : null;
    if (!hasAdminRole(typeof role === "string" ? role : null)) {
      throw notFound();
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

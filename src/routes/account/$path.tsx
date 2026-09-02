import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Settings } from "@/components/auth/settings/settings";
import { SiteShell } from "@/components/site-shell";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";
import { ensureRouteSession } from "@/lib/route-session";

const validAccountPathSegments = new Set(
  Object.values(AUTH_UI_VIEW_PATHS.settings),
);

export const Route = createFileRoute("/account/$path")({
  async beforeLoad({ params: { path }, context: { queryClient }, location }) {
    if (!validAccountPathSegments.has(path)) {
      throw notFound();
    }

    const session = await ensureRouteSession({ queryClient });

    if (!session) {
      throw redirect({
        to: "/auth/$path",
        params: { path: AUTH_UI_VIEW_PATHS.auth.signIn },
        search: { redirectTo: location.href },
      });
    }

    return { session };
  },
  component: AccountPage,
});

function AccountPage() {
  const { path } = Route.useParams();

  return (
    <SiteShell>
      <main className="mx-auto max-w-(--fd-layout-width) p-4 md:p-6">
        <Settings path={path} />
      </main>
    </SiteShell>
  );
}

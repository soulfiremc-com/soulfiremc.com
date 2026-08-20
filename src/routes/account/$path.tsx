import { ensureSession } from "@better-auth-ui/core";
import { ensureSessionServer } from "@better-auth-ui/core/server";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Settings } from "@/components/auth/settings/settings";
import { SiteShell } from "@/components/site-shell";
import { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";

const validAccountPathSegments = new Set(
  Object.values(AUTH_UI_VIEW_PATHS.settings),
);

export const Route = createFileRoute("/account/$path")({
  async beforeLoad({ params: { path }, context: { queryClient }, location }) {
    if (!validAccountPathSegments.has(path)) {
      throw notFound();
    }

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

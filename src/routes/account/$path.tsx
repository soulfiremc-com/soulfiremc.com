import { ensureSession as ensureSessionClient } from "@better-auth-ui/react";
import { ensureSession as ensureSessionServer } from "@better-auth-ui/react/server";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Settings } from "@/components/auth/settings/settings";
import { SiteShell } from "@/components/site-shell";
import { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

const validAccountPathSegments = new Set(["settings", "security"]);

export const Route = createFileRoute("/account/$path")({
  async beforeLoad({ params: { path }, context: { queryClient }, location }) {
    if (!validAccountPathSegments.has(path)) {
      throw notFound();
    }

    const ensureSession = createIsomorphicFn()
      .server(() =>
        ensureSessionServer(queryClient, auth, {
          headers: getRequestHeaders(),
        }),
      )
      .client(() => ensureSessionClient(queryClient, authClient));
    const session = await ensureSession();

    if (!session) {
      throw redirect({
        to: "/auth/$path",
        params: { path: "sign-in" },
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

import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Auth } from "@/components/auth/auth";
import { SiteShell } from "@/components/site-shell";

const validAuthPathSegments = new Set(Object.values(viewPaths.auth));

export const Route = createFileRoute("/auth/$path")({
  beforeLoad({ params: { path } }) {
    if (!validAuthPathSegments.has(path)) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { path } = Route.useParams();

  return (
    <SiteShell>
      <main className="flex min-h-[60vh] items-center justify-center p-4">
        <Auth path={path} />
      </main>
    </SiteShell>
  );
}

import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Auth } from "@/components/auth/auth";
import { SiteShell } from "@/components/site-shell";
import { emailOtpPlugin } from "@/lib/auth/email-otp-plugin";
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin";
import {
  AUTH_UI_BASE_PATHS,
  AUTH_UI_VIEW_PATHS,
  authRedirectPath,
  DEFAULT_AUTH_REDIRECT_PATH,
} from "@/lib/auth-ui-config";
import { authPageTitle } from "@/lib/auth-ui-titles";
import { ensureRouteSession } from "@/lib/route-session";

const validAuthPathSegments = new Set([
  ...Object.values<string>({ ...viewPaths.auth }),
  emailOtpPlugin().viewPaths.auth.emailOtp,
  twoFactorPlugin().viewPaths.auth.twoFactor,
]);

// A signed-in visitor has nothing to do on these forms, for example after
// pressing Back once sign-in finished. Re-authentication signs out first.
const signedOutOnlyPathSegments = new Set<string>([
  AUTH_UI_VIEW_PATHS.auth.signIn,
  AUTH_UI_VIEW_PATHS.auth.signUp,
]);
const signedOutOnlyPaths = new Set(
  [...signedOutOnlyPathSegments].map(
    (segment) => `${AUTH_UI_BASE_PATHS.auth}/${segment}`,
  ),
);

export const Route = createFileRoute("/auth/$path")({
  async beforeLoad({ params: { path }, context: { queryClient }, location }) {
    if (!validAuthPathSegments.has(path)) {
      // Guessed paths such as `/auth/login` most likely mean sign-in.
      throw redirect({
        to: "/auth/$path",
        params: { path: AUTH_UI_VIEW_PATHS.auth.signIn },
        search: location.search,
      });
    }

    if (
      signedOutOnlyPathSegments.has(path) &&
      (await ensureRouteSession({ queryClient }))
    ) {
      const target = authRedirectPath(
        "redirectTo" in location.search
          ? location.search.redirectTo
          : undefined,
      );
      const targetPath = target.split(/[?#]/u, 1)[0];
      // A redirect back to this form would loop.
      throw redirect({
        href: signedOutOnlyPaths.has(targetPath ?? "")
          ? DEFAULT_AUTH_REDIRECT_PATH
          : target,
      });
    }
  },
  head: ({ params: { path } }) => ({
    meta: [
      { title: authPageTitle(path, "en") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { path } = Route.useParams();

  return (
    <SiteShell>
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-8 md:py-12">
        {/* One row of social icons keeps the form short. */}
        <Auth path={path} socialLayout="horizontal" />
      </main>
    </SiteShell>
  );
}

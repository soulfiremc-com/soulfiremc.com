import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Auth } from "@/components/auth/auth";
import { SiteShell } from "@/components/site-shell";
import { emailOtpPlugin } from "@/lib/auth/email-otp-plugin";
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin";
import { authPageTitle } from "@/lib/auth-ui-titles";

const validAuthPathSegments = new Set([
  ...Object.values<string>({ ...viewPaths.auth }),
  emailOtpPlugin().viewPaths.auth.emailOtp,
  twoFactorPlugin().viewPaths.auth.twoFactor,
]);

export const Route = createFileRoute("/auth/$path")({
  beforeLoad({ params: { path } }) {
    if (!validAuthPathSegments.has(path)) {
      throw redirect({ to: "/{-$lang}" });
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
      <main className="flex min-h-[60vh] items-center justify-center p-4">
        {/* One row of social icons keeps the form short. */}
        <Auth path={path} socialLayout="horizontal" />
      </main>
    </SiteShell>
  );
}

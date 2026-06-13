import { captchaPlugin } from "@better-auth-ui/react/plugins";
import { useNavigate } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ThemeProvider, useTheme } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthTurnstile } from "@/components/auth-turnstile";
import { Toaster } from "@/components/ui/sonner";
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin";
import { passkeyPlugin } from "@/lib/auth/passkey-plugin";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { usernamePlugin } from "@/lib/auth/username-plugin";
import { authClient } from "@/lib/auth-client";
import { PostHogProvider } from "@/lib/integrations/posthog";
import { AuthLink } from "./auth-link";

function AuthUIProviders({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthProvider
      authClient={authClient}
      navigate={navigate}
      Link={AuthLink}
      redirectTo="/account/settings"
      basePaths={{ settings: "/account" }}
      viewPaths={{ settings: { account: "settings" } }}
      socialProviders={["google", "discord", "github"]}
      emailAndPassword={{
        forgotPassword: true,
        name: false,
        requireEmailVerification: true,
      }}
      plugins={[
        usernamePlugin({ isUsernameAvailable: true }),
        passkeyPlugin(),
        captchaPlugin({ render: AuthTurnstile }),
        deleteUserPlugin({ sendDeleteAccountVerification: true }),
        themePlugin({ useTheme }),
      ]}
      localization={{
        auth: {
          name: "Display Name",
          namePlaceholder: "Display Name",
        },
      }}
    >
      {children}
    </AuthProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <PostHogProvider>
          <RootProvider>
            <AuthUIProviders>
              {children}
              <Toaster richColors />
            </AuthUIProviders>
          </RootProvider>
        </PostHogProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}

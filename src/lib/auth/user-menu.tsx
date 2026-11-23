import { UserButton } from "@/components/auth/user/user-button";
import { AuthUIProviders } from "@/lib/auth/auth-ui-providers";

/**
 * The full header user menu. Pages without auth forms have no Better Auth UI
 * provider, so the menu brings its own there.
 */
export function UserMenu({ withProviders }: { withProviders: boolean }) {
  const button = <UserButton size="icon" />;
  return withProviders ? <AuthUIProviders>{button}</AuthUIProviders> : button;
}

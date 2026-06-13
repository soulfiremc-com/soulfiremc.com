import { useSession as useBetterAuthSession } from "@better-auth-ui/react";
import { authClient } from "@/lib/auth-client";

export function useSession() {
  return useBetterAuthSession(authClient);
}

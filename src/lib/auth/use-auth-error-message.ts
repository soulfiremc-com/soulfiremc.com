import { getAuthErrorMessage } from "@better-auth-ui/core";
import { useAuth } from "@better-auth-ui/react";
import { useCallback } from "react";

import { localizedAuthErrorMessage } from "@/lib/auth/auth-error-messages";
import { useLocale } from "@/lib/i18n-react";

/**
 * Like `getAuthErrorMessage`, but known Better Auth error codes use friendly
 * wording in the page language instead of the server's English message.
 */
export function useAuthErrorMessage() {
  const { localization } = useAuth();
  const locale = useLocale();

  return useCallback(
    (error: unknown, mutationKey?: readonly unknown[]) =>
      localizedAuthErrorMessage(error, locale) ??
      getAuthErrorMessage(error, localization, mutationKey),
    [locale, localization],
  );
}

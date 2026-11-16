import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from "@tanstack/react-router";
import { BookOpenIcon, HomeIcon, RotateCwIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { localizeHref } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n-react";
import { resolveMessage } from "@/lib/messages";
import { isNetworkError } from "@/lib/network-error";

export function StatusMessage({
  actions,
  text,
  title,
}: {
  actions: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 md:py-24">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-balance">{title}</h1>
          <p className="text-pretty break-words text-muted-foreground">
            {text}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </main>
  );
}

export function HomeButton({ variant }: { variant: "default" | "outline" }) {
  const t = useT();
  const locale = useLocale();
  return (
    <Button
      nativeButton={false}
      variant={variant}
      render={
        <Link to={localizeHref("/", locale)}>
          <HomeIcon data-icon="inline-start" />
          {t("errors.goToHomepage")}
        </Link>
      }
    />
  );
}

/** Shown inside the root providers when no route matches or a loader throws `notFound()`. */
export function NotFoundPage() {
  const t = useT();
  const locale = useLocale();
  return (
    <SiteShell>
      <StatusMessage
        title={t("errors.pageNotFound")}
        text={t("errors.thePageYouRequestedDoesNotExist")}
        actions={
          <>
            <HomeButton variant="default" />
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link to={localizeHref("/docs", locale)}>
                  <BookOpenIcon data-icon="inline-start" />
                  {t("errors.openDocs")}
                </Link>
              }
            />
          </>
        }
      />
    </SiteShell>
  );
}

/**
 * Replaces the root component, so callers must wrap it in the app providers.
 * It skips the site shell because the shell itself may have thrown.
 */
export function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const offline = isNetworkError(
    error,
    typeof navigator === "undefined" || navigator.onLine,
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <StatusMessage
        title={
          offline
            ? t("errors.couldNotLoadPage")
            : t("errors.somethingWentWrong")
        }
        text={
          offline
            ? t("errors.checkYourConnection")
            : error instanceof Error && error.message
              ? resolveMessage(locale, error.message)
              : t("errors.anUnexpectedErrorOccurred")
        }
        actions={
          <>
            <Button
              onClick={() => {
                reset();
                void router.invalidate();
              }}
            >
              <RotateCwIcon data-icon="inline-start" />
              {t("errors.tryAgain")}
            </Button>
            <HomeButton variant="outline" />
          </>
        }
      />
    </div>
  );
}

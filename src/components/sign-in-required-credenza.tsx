"use client";

import { useT } from "@/lib/i18n-react";

import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";

export function SignInRequiredCredenza({
  open,
  onOpenChange,
  title,
  description,
  returnHash,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Section to scroll back to after sign-in, such as `reviews`. */
  returnHash?: string;
}) {
  const t = useT();
  const router = useRouter();

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="sm:max-w-md" closeLabel={t("common.close")}>
        <CredenzaHeader>
          <CredenzaTitle>{title}</CredenzaTitle>
          <CredenzaDescription>{description}</CredenzaDescription>
        </CredenzaHeader>
        <CredenzaFooter>
          <CredenzaClose
            render={
              <Button type="button" variant="outline">
                {t("common.cancel")}
              </Button>
            }
          />
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              const currentPath =
                typeof window === "undefined"
                  ? "/"
                  : `${window.location.pathname}${window.location.search}${returnHash ? `#${returnHash}` : window.location.hash}`;
              const target = `/auth/sign-in?redirectTo=${encodeURIComponent(currentPath)}`;
              void router.navigate({ href: target });
            }}
          >
            {t("common.signIn")}
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}

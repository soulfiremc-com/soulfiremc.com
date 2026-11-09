"use client";

import { useT } from "@/lib/i18n-react";

import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaBody,
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}) {
  const t = useT();
  const router = useRouter();

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="sm:max-w-md" closeLabel={t("Close")}>
        <CredenzaHeader>
          <CredenzaTitle>{title}</CredenzaTitle>
          <CredenzaDescription>{description}</CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody>
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {t("Sign in to your account to submit ratings and reviews.")}
          </div>
        </CredenzaBody>
        <CredenzaFooter>
          <CredenzaClose
            render={
              <Button type="button" variant="outline">
                {t("Cancel")}
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
                  : `${window.location.pathname}${window.location.search}`;
              const target = `/auth/sign-in?redirectTo=${encodeURIComponent(currentPath)}`;
              void router.navigate({ href: target });
            }}
          >
            {t("Sign In")}
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}

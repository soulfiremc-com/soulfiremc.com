"use client";

import { isReauthenticationRequiredError } from "@better-auth-ui/core";
import type {
  AddPasskeyParams,
  PasskeyAuthClient,
} from "@better-auth-ui/core/plugins/passkey";
import { useAuth, useAuthPlugin } from "@better-auth-ui/react";
import { useAddPasskey } from "@better-auth-ui/react/plugins/passkey";
import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { passkeyPlugin } from "@/lib/auth/passkey-plugin";
import { useAuthForm } from "../auth-form";
import { ReauthenticationAction } from "../reauthentication";

export type AddPasskeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddPasskeyDialog({
  open,
  onOpenChange,
}: AddPasskeyDialogProps) {
  const { authClient, localization } = useAuth<PasskeyAuthClient>();
  const { authenticatorAttachment, localization: passkeyLocalization } =
    useAuthPlugin(passkeyPlugin);

  const addPasskey = useAddPasskey(authClient);
  // The passkey client returns WebAuthn failures, such as an authenticator
  // that is already registered, instead of throwing them.
  const [ceremonyError, setCeremonyError] = useState<string | null>(null);

  const submitRequest = async (
    request: AddPasskeyParams<PasskeyAuthClient>,
  ) => {
    const requestWithCallbacks = {
      ...request,
      fetchOptions: {
        ...request?.fetchOptions,
        onSuccess: () => handleOpenChange(false),
      },
    };
    setCeremonyError(null);
    const result = await addPasskey.mutateAsync(requestWithCallbacks);
    // A cancelled prompt needs no message.
    if (
      result?.error &&
      !(
        "code" in result.error && result.error.code === "ERROR_CEREMONY_ABORTED"
      )
    ) {
      setCeremonyError(result.error.message ?? localization.errors.generic);
    }
  };

  const form = useAuthForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      const name = value.name.trim();
      await submitRequest({
        ...(name ? { name } : {}),
        ...(authenticatorAttachment ? { authenticatorAttachment } : {}),
      } as AddPasskeyParams<PasskeyAuthClient>);
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      addPasskey.reset();
      setCeremonyError(null);
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  const needsReauthentication = isReauthenticationRequiredError(
    addPasskey.error,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {needsReauthentication ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">
                {localization.settings.reauthenticationTitle}
              </DialogTitle>
            </DialogHeader>
            <ReauthenticationAction showTitle={false} />
          </>
        ) : (
          <form.AppForm>
            <form.AuthFormRoot className="flex flex-col gap-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Fingerprint />
                  {passkeyLocalization.addPasskey}
                </DialogTitle>

                <DialogDescription>
                  {passkeyLocalization.passkeysDescription}
                </DialogDescription>
              </DialogHeader>

              <form.AppField name="name">
                {(field) => (
                  <Field data-invalid={addPasskey.isError || !!ceremonyError}>
                    <FieldLabel htmlFor="passkey-name">
                      {passkeyLocalization.name}
                    </FieldLabel>
                    <Input
                      id="passkey-name"
                      autoComplete="off"
                      name={field.name}
                      autoFocus
                      placeholder={localization.settings.optional}
                      disabled={addPasskey.isPending}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={addPasskey.isError || !!ceremonyError}
                    />
                    {addPasskey.error ? (
                      <FieldError>
                        {addPasskey.error.error?.message ??
                          addPasskey.error.message}
                      </FieldError>
                    ) : (
                      ceremonyError && <FieldError>{ceremonyError}</FieldError>
                    )}
                  </Field>
                )}
              </form.AppField>

              <DialogFooter>
                <DialogClose
                  className={buttonVariants({ variant: "outline" })}
                  disabled={addPasskey.isPending}
                  type="button"
                >
                  {localization.settings.cancel}
                </DialogClose>

                <form.AuthFormSubmitButton
                  isPending={addPasskey.isPending}
                  disabled={addPasskey.isPending}
                >
                  {passkeyLocalization.addPasskey}
                </form.AuthFormSubmitButton>
              </DialogFooter>
            </form.AuthFormRoot>
          </form.AppForm>
        )}
      </DialogContent>
    </Dialog>
  );
}

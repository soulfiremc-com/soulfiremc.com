"use client";

import {
  disableTwoFactorOptions,
  type TwoFactorAuthClient,
} from "@better-auth-ui/core/plugins/two-factor";
import { getAuthErrorCode } from "@better-auth-ui/core";
import { useAuth, useAuthPlugin } from "@better-auth-ui/react";
import { useMutation } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { withInlineErrors } from "@/lib/auth/inline-errors";
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin";
import { useTwoFactorPasswordRequirement } from "@/lib/auth/use-two-factor-password";
import { useAuthForm } from "../auth-form";
import { useFocusRejectedPassword } from "../use-focus-rejected-password";

export type DisableTwoFactorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Confirm turning two-factor off.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Called when the dialog requests an open state change.
 */
export function DisableTwoFactorDialog({
  open,
  onOpenChange,
}: DisableTwoFactorDialogProps) {
  const { authClient, localization } = useAuth();
  const { localization: twoFactorLocalization } =
    useAuthPlugin(twoFactorPlugin);
  const { isPending: isResolvingPasswordRequirement, requiresPassword } =
    useTwoFactorPasswordRequirement();
  const [isPasswordRejected, setIsPasswordRejected] = useState(false);

  const { mutateAsync: disableTwoFactor, isPending: isDisabling } = useMutation(
    {
      ...withInlineErrors(
        disableTwoFactorOptions(authClient as TwoFactorAuthClient),
      ),
      onError: (error) =>
        setIsPasswordRejected(getAuthErrorCode(error) === "INVALID_PASSWORD"),
      onSuccess: () => {
        toast.success(twoFactorLocalization.twoFactorDisabled);
        onOpenChange(false);
      },
    },
  );

  const isPending = isDisabling || isResolvingPasswordRequirement;
  const passwordInputRef = useFocusRejectedPassword(
    isPasswordRejected,
    isPending,
  );

  const form = useAuthForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) =>
      await disableTwoFactor(
        requiresPassword ? { password: value.password } : {},
      ),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form.AppForm>
          <form.AuthFormRoot className="flex flex-col gap-6">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <ShieldAlert />
              </AlertDialogMedia>

              <AlertDialogTitle>
                {twoFactorLocalization.disableTwoFactor}
              </AlertDialogTitle>

              <AlertDialogDescription>
                {requiresPassword
                  ? twoFactorLocalization.passwordConfirmation
                  : twoFactorLocalization.twoFactorDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {requiresPassword && (
              <form.AppField name="password">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="disable-two-factor-password">
                      {localization.auth.password}
                    </FieldLabel>

                    <Input
                      ref={passwordInputRef}
                      id="disable-two-factor-password"
                      name={field.name}
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      required
                      placeholder={localization.auth.passwordPlaceholder}
                      disabled={isPending}
                      aria-invalid={isPasswordRejected}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        setIsPasswordRejected(false);
                      }}
                    />

                    <FieldError />
                  </Field>
                )}
              </form.AppField>
            )}

            <form.AuthFormServerError />

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                {localization.settings.cancel}
              </AlertDialogCancel>

              <form.AuthFormSubmitButton
                isPending={isPending}
                variant="destructive"
                disabled={isPending}
              >
                {twoFactorLocalization.disableTwoFactor}
              </form.AuthFormSubmitButton>
            </AlertDialogFooter>
          </form.AuthFormRoot>
        </form.AppForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}

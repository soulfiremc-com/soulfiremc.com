"use client";

import { useAuthPlugin } from "@better-auth-ui/react";
import { Fingerprint } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { passkeyPlugin } from "@/lib/auth/passkey-plugin";

/** Empty list state. The card header owns the single "Add passkey" action. */
export function PasskeysEmpty() {
  const { localization: passkeyLocalization } = useAuthPlugin(passkeyPlugin);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Fingerprint />
        </EmptyMedia>
        <EmptyTitle>{passkeyLocalization.noPasskeys}</EmptyTitle>
        <EmptyDescription>
          {passkeyLocalization.passkeysDescription}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

"use client";

import type { CaptchaRenderProps } from "@better-auth-ui/react/plugins";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import {
  type BoundTurnstileObject,
  Turnstile,
  type TurnstileProps,
} from "react-turnstile";

function rememberTurnstile(
  ref: RefObject<BoundTurnstileObject | null>,
  boundTurnstile?: BoundTurnstileObject,
) {
  if (boundTurnstile) {
    ref.current = boundTurnstile;
  }
}

export function AuthTurnstile({
  setToken,
  clearToken,
  setReset,
}: CaptchaRenderProps) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const turnstileRef = useRef<BoundTurnstileObject | null>(null);

  useEffect(() => {
    setReset(() => turnstileRef.current?.reset());
    return () => setReset(null);
  }, [setReset]);

  const handleLoad = useCallback<NonNullable<TurnstileProps["onLoad"]>>(
    (_widgetId, boundTurnstile) => {
      turnstileRef.current = boundTurnstile;
    },
    [],
  );

  const handleVerify = useCallback<NonNullable<TurnstileProps["onVerify"]>>(
    (token, boundTurnstile) => {
      turnstileRef.current = boundTurnstile;
      setToken(token);
    },
    [setToken],
  );

  const handleClear = useCallback(
    (boundTurnstile?: BoundTurnstileObject) => {
      rememberTurnstile(turnstileRef, boundTurnstile);
      clearToken();
    },
    [clearToken],
  );

  const handleError = useCallback<NonNullable<TurnstileProps["onError"]>>(
    (_error, boundTurnstile) => handleClear(boundTurnstile),
    [handleClear],
  );

  const handleExpire = useCallback<NonNullable<TurnstileProps["onExpire"]>>(
    (_token, boundTurnstile) => handleClear(boundTurnstile),
    [handleClear],
  );

  const handleTimeout = useCallback<NonNullable<TurnstileProps["onTimeout"]>>(
    (boundTurnstile) => handleClear(boundTurnstile),
    [handleClear],
  );

  const handleUnsupported = useCallback<
    NonNullable<TurnstileProps["onUnsupported"]>
  >((boundTurnstile) => handleClear(boundTurnstile), [handleClear]);

  if (!siteKey) {
    return null;
  }

  return (
    <Turnstile
      sitekey={siteKey}
      size="flexible"
      responseField={false}
      onLoad={handleLoad}
      onVerify={handleVerify}
      onError={handleError}
      onExpire={handleExpire}
      onTimeout={handleTimeout}
      onUnsupported={handleUnsupported}
    />
  );
}

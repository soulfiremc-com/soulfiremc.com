"use client";

import { useT } from "@/lib/i18n-react";

import { Cookie } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CookieConsentBanner = () => {
  const t = useT();
  const [consentState, setConsentState] = useState<
    ReturnType<typeof posthog.get_explicit_consent_status> | ""
  >("");

  useEffect(() => {
    setConsentState(posthog.get_explicit_consent_status());
  }, []);

  const respond = (status: "granted" | "denied") => {
    if (status === "granted") posthog.opt_in_capturing();
    else posthog.opt_out_capturing();
    // React commits this click's update before PostHog's document click
    // listener records the click, so its dead-click check never sees the
    // banner close. Closing in the next task keeps the response measurable.
    setTimeout(() => setConsentState(status), 0);
  };

  const handleAcceptCookies = () => respond("granted");
  const handleDeclineCookies = () => respond("denied");

  if (consentState !== "pending") {
    return null;
  }

  return (
    <section
      aria-labelledby="cookie-consent-title"
      className="fixed bottom-0 left-0 z-50 sm:bottom-4 sm:left-4"
    >
      {/* Tighter side padding on phones leaves more room for page actions. */}
      <Card className="m-3 shadow-lg sm:max-w-md">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 sm:px-6">
          <CardTitle id="cookie-consent-title" className="text-lg">
            {t("cookies.title")}
          </CardTitle>
          <Cookie aria-hidden="true" className="size-5" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4 sm:px-6">
          <CardDescription className="text-sm">
            {t("cookies.description")}
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            {t("cookies.acceptanceNotice")}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2 px-4 sm:px-6">
          <Button
            type="button"
            onClick={handleDeclineCookies}
            variant="secondary"
            className="flex-1"
          >
            {t("cookies.decline")}
          </Button>
          <Button
            type="button"
            onClick={handleAcceptCookies}
            className="flex-1"
          >
            {t("cookies.accept")}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
};

export { CookieConsentBanner };
export default CookieConsentBanner;

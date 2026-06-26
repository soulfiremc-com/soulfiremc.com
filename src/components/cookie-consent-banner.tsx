"use client";

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
  const [consentState, setConsentState] = useState<
    ReturnType<typeof posthog.get_explicit_consent_status> | ""
  >("");

  useEffect(() => {
    setConsentState(posthog.get_explicit_consent_status());
  }, []);

  const handleAcceptCookies = () => {
    posthog.opt_in_capturing();
    setConsentState("granted");
  };

  const handleDeclineCookies = () => {
    posthog.opt_out_capturing();
    setConsentState("denied");
  };

  if (consentState !== "pending") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 z-50 sm:bottom-4 sm:left-4">
      <Card className="m-3 shadow-lg sm:max-w-md">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">We use cookies</CardTitle>
          <Cookie className="size-5" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <CardDescription className="text-sm">
            We use tracking cookies to understand how you use the product and
            help us improve it. Please accept cookies to help us improve.
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            By clicking <span className="font-medium">"Accept"</span>, you agree
            to our use of cookies.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2 pt-2">
          <Button
            type="button"
            onClick={handleDeclineCookies}
            variant="secondary"
            className="flex-1"
          >
            Decline
          </Button>
          <Button
            type="button"
            onClick={handleAcceptCookies}
            className="flex-1"
          >
            Accept
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export { CookieConsentBanner };
export default CookieConsentBanner;

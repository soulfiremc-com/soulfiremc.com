"use client";

import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n-react";

import { Cookie } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CONSENT_CHANGE_EVENT,
  REOPEN_EVENT,
  useAnalyticsConsent,
} from "@/lib/cookie-consent";
import { loadPostHog } from "@/lib/integrations/posthog";

const CookieConsentBanner = () => {
  const t = useT();
  const consent = useAnalyticsConsent();
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const open = openOverride ?? consent === "pending";
  const [reopened, setReopened] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      if (document.activeElement instanceof HTMLElement) {
        returnFocusRef.current = document.activeElement;
      }
      setOpenOverride(true);
      setReopened(true);
    };
    window.addEventListener(REOPEN_EVENT, show);
    return () => {
      window.removeEventListener(REOPEN_EVENT, show);
    };
  }, []);

  // A reopened banner takes focus so keyboard users land on the choices.
  useEffect(() => {
    if (open && reopened) sectionRef.current?.focus();
  }, [open, reopened]);

  // Publish the banner height so the page can scroll its last content and
  // focused fields clear of it.
  useEffect(() => {
    const section = sectionRef.current;
    if (!open || !section) return undefined;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(
        "--cookie-banner-height",
        `${section.offsetHeight}px`,
      );
    });
    observer.observe(section);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--cookie-banner-height");
    };
  }, [open]);

  const respond = (status: "granted" | "denied") => {
    setOpenOverride(true);
    void loadPostHog().then((posthog) => {
      if (!posthog) return;
      if (status === "granted") posthog.opt_in_capturing();
      else posthog.opt_out_capturing();
      window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    });
    // React commits this click's update before PostHog's document click
    // listener records the click, so its dead-click check never sees the
    // banner close. Closing in the next task keeps the response measurable.
    // A reopened banner hands focus back to the control that opened it.
    setTimeout(() => {
      setOpenOverride(false);
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    }, 0);
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="h-(--cookie-banner-height)" />
      <section
        ref={sectionRef}
        tabIndex={-1}
        aria-labelledby="cookie-consent-title"
        className="fixed bottom-0 left-0 z-45 outline-none sm:bottom-4 sm:left-4 short:inset-x-0 short:bottom-0"
      >
        {/* Tighter side padding on phones leaves more room for page actions. */}
        {/* Short landscape screens get one row so forms stay visible. */}
        <Card className="m-3 shadow-lg sm:max-w-md short:m-2 short:max-w-none short:flex-row short:items-center">
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 sm:px-6 short:sr-only">
            <CardTitle id="cookie-consent-title" className="text-lg">
              {t("cookies.title")}
            </CardTitle>
            <Cookie aria-hidden="true" className="size-5" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2 px-4 sm:px-6 short:pr-0">
            <CardDescription className="text-sm">
              {t("cookies.description")}
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {t("cookies.acceptanceNotice")}{" "}
              <Link
                to="/cookie-policy"
                hash="cookie-settings"
                className="underline underline-offset-2"
              >
                {t("cookies.cookieSettings")}
              </Link>
            </p>
          </CardContent>
          <CardFooter className="flex gap-2 px-4 sm:px-6 short:shrink-0 short:pl-0">
            <Button
              type="button"
              onClick={() => {
                respond("denied");
              }}
              variant="secondary"
              className="flex-1"
            >
              {t("cookies.decline")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                respond("granted");
              }}
              className="flex-1"
            >
              {t("cookies.accept")}
            </Button>
          </CardFooter>
        </Card>
      </section>
    </>
  );
};

export { CookieConsentBanner };

import { translate } from "@/lib/messages";
import { TranslatedMessage } from "@/components/translated-message";
import { useLocale, useT } from "@/lib/i18n-react";
import { formatEuro, isLocale } from "@/lib/i18n";
import { SiKofi } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Coins, Download, Heart, Users } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequiredEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  jsonLdScript,
} from "@/lib/seo";

const freeTierFeatures = [
  "support.fullSoulfireBotFramework",
  "support.windowsMacosAndLinux",
  "support.javaFromClassicToLatestPlusBedrock",
  "support.visualScriptingSystem",
  "home.pluginSystem",
  "support.communitySupport",
  "support.openSourceAgpl30",
] as const;

const supporterTierFeatures = [
  "support.everythingInFree",
  "support.prioritySupportViaDiscord",
  "support.priorityWithFeatureRequests",
  "support.supporterRoleInDiscord",
] as const;

function PricingPageContent() {
  const t = useT();
  const locale = useLocale();
  return (
    <main className="mx-auto w-full max-w-(--fd-layout-width) px-4 py-12">
      <div className="mb-12 flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("support.simpleTransparentPricing")}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          {t("support.hero.description")}
        </p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Users className="size-5" />
              </div>
              <CardTitle className="text-xl">{t("common.free")}</CardTitle>
            </div>
            <span className="text-4xl font-bold">{formatEuro(0, locale)}</span>
            <CardDescription>
              {t("support.everyFeatureIncluded")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="flex flex-col gap-3">
              {freeTierFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="text-sm">{t(feature)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Link
              to="/{-$lang}/download"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              <Download className="size-4" />
              {t("download.title")}
            </Link>
          </CardFooter>
        </Card>
        <Card className="flex flex-col border-primary">
          <CardHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Heart className="size-5 text-primary" />
              </div>
              <CardTitle className="text-xl">
                {t("support.supporter")}
              </CardTitle>
              <Badge variant="secondary">{t("support.optional")}</Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                {formatEuro(5, locale)}
              </span>
              <span className="text-muted-foreground">
                {t("support.month")}
              </span>
            </div>
            <CardDescription>
              {t("support.supportTheProjectAndGetPriorityHelpWhenYou")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="flex flex-col gap-3">
              {supporterTierFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="text-sm">{t(feature)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <a
              href="https://ko-fi.com/alexprogrammerde/tiers"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants(), "w-full")}
            >
              <SiKofi aria-hidden className="size-4" />
              {t("support.becomeASupporter")}
            </a>
          </CardFooter>
        </Card>
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
        <TranslatedMessage
          text="support.perks.delivery"
          values={{
            discord: (
              <a
                href={getRequiredEnv(
                  import.meta.env.VITE_DISCORD_LINK,
                  "VITE_DISCORD_LINK",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t("support.discordServer")}
              </a>
            ),
          }}
        />
      </p>
      <div className="mt-16 mb-8 flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("support.oneTimeDonations")}
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          {t("support.donation.description")}
        </p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <SiKofi aria-hidden className="size-5" />
              Ko-fi
            </CardTitle>
            <CardDescription>
              {t("support.donateOnceViaPaypalOrCard")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto">
            <a
              href="https://ko-fi.com/alexprogrammerde"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              <SiKofi aria-hidden className="size-4" />
              {t("support.openKofi")}
            </a>
          </CardFooter>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Coins className="size-5" />
              {t("support.crypto")}
            </CardTitle>
            <CardDescription>
              {t("support.donateWithCryptocurrencyViaNowpayments")}
            </CardDescription>
          </CardHeader>
          {/* Links instead of embedded widgets keep the page short and load
              no payment provider code until someone chooses to donate. */}
          <CardFooter className="mt-auto">
            <a
              href="https://nowpayments.io/embeds/donation-widget?api_key=99dbdb4c-b2d7-4470-a0d9-b8bb978c4881"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              <Coins className="size-4" />
              {t("support.openNowpayments")}
            </a>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/{-$lang}/pricing")({
  head: ({ params }) => {
    const locale = isLocale(params.lang) ? params.lang : "en";
    const title = translate(locale, "support.meta.title");
    const description = translate(locale, "support.meta.description");
    const imageUrl = "/og/site/pricing/image.webp";
    return {
      meta: getPageMeta({
        locale,
        title,
        description,
        path: "/pricing",
        imageUrl,
        imageAlt: translate(locale, "support.soulfirePricingPreview"),
      }),
      links: getCanonicalLinks("/pricing", locale),
      scripts: [
        jsonLdScript(
          createStructuredDataGraph([
            createWebPageStructuredData({
              locale,
              path: "/pricing",
              title,
              description,
              imageUrl,
            }),
          ]),
        ),
      ],
    };
  },
  component: PricingPage,
});

function PricingPage() {
  return (
    <SiteShell>
      <PricingPageContent />
    </SiteShell>
  );
}

import { translate } from "@/lib/messages";
import { TranslatedMessage } from "@/components/translated-message";
import { useLocale, useT } from "@/lib/i18n-react";
import { formatEuro, isLocale } from "@/lib/i18n";
import { SiKofi } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Coins, Download, Gift, Heart, Users } from "lucide-react";
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
  "support.allPlatformsSupported",
  "support.everyMinecraftVersion",
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
  "support.supportOngoingDevelopment",
  "support.helpKeepTheProjectAlive",
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
          {t("support.soulfireIsAndAlwaysWillBeFreeIfYou")}
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
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                {formatEuro(0, locale)}
              </span>
              <span className="text-muted-foreground">
                {t("support.month")}
              </span>
            </div>
            <CardDescription>
              {t("support.everythingYouNeedToRunBotsOnYourServer")}
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
              <SiKofi className="size-4" />
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
      <div className="mt-20 mb-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-lg bg-muted p-3">
          <Gift className="size-6" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          {t("support.oneTimeDonations")}
        </h2>
        <p className="max-w-2xl text-lg text-muted-foreground">
          {t("support.donation.description")}
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("support.onlyTheKoFiMembershipGrantsSupporterPerksOne")}
        </p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <SiKofi className="size-5" />
              Ko-fi
            </CardTitle>
            <CardDescription>
              {t("support.donateViaPaypalOrCardMembershipAndOneTime")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {/* oxlint-disable-next-line react/iframe-missing-sandbox -- the third-party video and payment widgets need popups and navigation that a sandbox would block */}
            <iframe
              src="https://ko-fi.com/alexprogrammerde/?hidefeed=true&widget=true&embed=true&preview=true"
              className="w-full rounded-md border-none bg-muted"
              height="712"
              title="Ko-fi"
              loading="lazy"
            />
          </CardContent>
          <CardFooter>
            <a
              href="https://ko-fi.com/alexprogrammerde"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              <SiKofi className="size-4" />
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
          <CardContent className="flex-1">
            {/* oxlint-disable-next-line react/iframe-missing-sandbox -- the third-party video and payment widgets need popups and navigation that a sandbox would block */}
            <iframe
              src="https://nowpayments.io/embeds/donation-widget?api_key=99dbdb4c-b2d7-4470-a0d9-b8bb978c4881"
              height="623"
              className="mx-auto block w-full max-w-[346px] overflow-y-hidden rounded-md border-none bg-muted"
              title={t("support.nowpaymentsDonationWidget")}
              loading="lazy"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/{-$lang}/pricing")({
  head: ({ params }) => ({
    meta: getPageMeta({
      locale: isLocale(params.lang) ? params.lang : "en",
      title: translate(
        isLocale(params.lang) ? params.lang : "en",
        "support.meta.title",
      ),
      description: translate(
        isLocale(params.lang) ? params.lang : "en",
        "support.meta.description",
      ),
      path: "/pricing",
      imageUrl: "/og/site/pricing/image.webp",
      imageAlt: translate(
        isLocale(params.lang) ? params.lang : "en",
        "support.soulfirePricingPreview",
      ),
    }),
    links: getCanonicalLinks(
      "/pricing",
      isLocale(params.lang) ? params.lang : "en",
    ),
    scripts: [
      jsonLdScript(
        createStructuredDataGraph([
          createWebPageStructuredData({
            locale: isLocale(params.lang) ? params.lang : "en",
            path: "/pricing",
            title: translate(
              isLocale(params.lang) ? params.lang : "en",
              "support.meta.title",
            ),
            description: translate(
              isLocale(params.lang) ? params.lang : "en",
              "support.meta.description",
            ),
            imageUrl: "/og/site/pricing/image.webp",
          }),
        ]),
      ),
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <SiteShell>
      <PricingPageContent />
    </SiteShell>
  );
}

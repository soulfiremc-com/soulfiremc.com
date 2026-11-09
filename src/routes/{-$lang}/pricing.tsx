import { TranslatedMessage } from "@/components/translated-message";
import { useLocale } from "@/lib/i18n-react";
import { localizePath } from "@/lib/i18n";
import { useT } from "@/lib/i18n-react";
import { isLocale } from "@/lib/i18n";
import { SiKofi } from "@icons-pack/react-simple-icons";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Code, Gift, Heart, Users } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequiredEnv } from "@/lib/env";
import {
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  jsonLdScript,
} from "@/lib/seo";

const freeTierFeatures = [
  "Full SoulFire bot framework",
  "All platforms supported",
  "Every Minecraft version",
  "Visual scripting system",
  "Plugin system",
  "Community support",
  "Open source (AGPL-3.0)",
];

const supporterTierFeatures = [
  "Priority support via Discord",
  "Priority with feature requests",
  "Supporter role in Discord",
  "Support ongoing development",
  "Help keep the project alive",
];

function PricingPageContent() {
  const locale = useLocale();
  const t = useT();
  return (
    <main className="px-4 py-12 w-full max-w-(--fd-layout-width) mx-auto">
      <div className="flex flex-col items-center text-center gap-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("Simple, transparent pricing")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {t(
            "SoulFire is and always will be free. If you love the project, consider becoming a supporter.",
          )}
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-muted p-2">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">{t("Free")}</CardTitle>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">0€</span>
              <span className="text-muted-foreground">{t("/month")}</span>
            </div>
            <CardDescription>
              {t("Everything you need to run bots on your server")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="flex flex-col gap-3">
              {freeTierFeatures.map((feature) => (
                <li key={t(feature)} className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span className="text-sm">{t(feature)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              render={
                <a href={localizePath("/download", locale)}>
                  <Code className="h-4 w-4" />
                  {t("Get Started")}
                </a>
              }
              nativeButton={false}
              variant="outline"
              className="w-full"
            />
          </CardFooter>
        </Card>
        <Card className="flex flex-col border-primary">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl">{t("Supporter")}</CardTitle>
              <Badge>{t("Popular")}</Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">5€</span>
              <span className="text-muted-foreground">{t("/month")}</span>
            </div>
            <CardDescription>
              {t("Support the project and get priority help when you need it")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="flex flex-col gap-3">
              {supporterTierFeatures.map((feature) => (
                <li key={t(feature)} className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span className="text-sm">{t(feature)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              render={
                <a
                  href="https://ko-fi.com/alexprogrammerde/tiers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SiKofi className="h-4 w-4" />
                  {t("Become a Supporter")}
                </a>
              }
              nativeButton={false}
              className="w-full"
            />
          </CardFooter>
        </Card>
      </div>
      <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
        <TranslatedMessage
          text="Supporter perks are delivered through our {discord}. After subscribing on Ko-fi, you'll receive your supporter role and access to priority support channels."
          values={{
            discord: (
              <a
                href={getRequiredEnv(
                  import.meta.env.VITE_DISCORD_LINK,
                  "VITE_DISCORD_LINK",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                {t("Discord server")}
              </a>
            ),
          }}
        />
      </p>
      <div className="flex flex-col items-center text-center gap-4 mt-20 mb-12">
        <div className="rounded-lg bg-muted p-3">
          <Gift className="h-6 w-6" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          {t("One-time Donations")}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {t(
            "Want to support SoulFire without a recurring commitment? You can make a one-time donation via Ko-fi or cryptocurrency.",
          )}
        </p>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t(
            "Only the Ko-fi membership grants supporter perks. One-time payments via Ko-fi or NOWPayments do not grant any perks.",
          )}
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <SiKofi className="h-5 w-5" />
              {t("Ko-fi")}
            </CardTitle>
            <CardDescription>
              {t(
                "Donate via PayPal or card. Membership and one-time options available.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <iframe
              src="https://ko-fi.com/alexprogrammerde/?hidefeed=true&widget=true&embed=true&preview=true"
              className="border-none w-full"
              height="712"
              title={t("alexprogrammerde")}
            />
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {t("💰 Crypto")}
            </CardTitle>
            <CardDescription>
              {t("Donate with cryptocurrency via NOWPayments")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <iframe
              src="https://nowpayments.io/embeds/donation-widget?api_key=99dbdb4c-b2d7-4470-a0d9-b8bb978c4881"
              width="346"
              height="623"
              className="border-none overflow-y-hidden mx-auto"
              title={t("NOWPayments Donation Widget")}
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
      title: "Pricing - SoulFire",
      description:
        "SoulFire is free and open source. Support the project and get priority help.",
      path: "/pricing",
      imageUrl: "/og/site/pricing/image.webp",
      imageAlt: "SoulFire pricing preview",
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
            title: "Pricing - SoulFire",
            description:
              "SoulFire is free and open source. Support the project and get priority help.",
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

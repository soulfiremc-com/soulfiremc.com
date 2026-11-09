import { Link } from "@tanstack/react-router";
import { TranslatedMessage } from "@/components/translated-message";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { localizePath, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n-react";
import { translate } from "@/lib/messages";

export const providerFaqs = {
  accounts: [
    {
      question: "What are MFA accounts?",
      answer:
        "MFA (Multi-Factor Authentication) accounts are permanent Minecraft accounts with full access. In alt-shop terms, they are the closest match to full-access Minecraft alts because you can change the email, password, and username. They're more secure and stable, which makes them pricier. Learn more in the {guide}.",
      guide: "Account Guide",
    },
    {
      question: "What are NFA accounts?",
      answer:
        "NFA (Non-Full Access) accounts are temporary Minecraft alts that may stop working over time. They're cheaper but come with a higher risk of losing access. See the {guide} for details on supported account types.",
      guide: "Account Guide",
    },
    {
      question: "Which account type works with SoulFire?",
      answer:
        "MFA accounts are fully supported by SoulFire. For NFA accounts, SoulFire supports refresh token, cookie, and access token auth. Read the {guide} for setup instructions.",
      guide: "Account Guide",
    },
    {
      question: "What are temporary Minecraft alts?",
      answer:
        "When people search for temporary Minecraft alts, they usually mean NFA accounts or token and cookie-based accounts. These are cheaper than MFA or full-access accounts, but access can expire or stop working over time.",
    },
    {
      question: "What are token and cookie accounts?",
      answer:
        "Token and cookie accounts are common delivery formats for lower-cost Minecraft alts. SoulFire supports refresh token, cookie, and access token auth for compatible NFA providers.",
    },
    {
      question: "What does SFA mean?",
      answer:
        "In community jargon, SFA usually means Semi Full Access. The term is inconsistent across alt shops and some marketplaces treat it as misleading, so SoulFire uses the clearer MFA/full-access and NFA/temporary labels instead.",
    },
    {
      question: "Are these providers affiliated with SoulFire?",
      answer:
        "This is still a community-curated list and SoulFire does not own or operate these providers. Partner, official integration, and affiliate relationships are labeled on the page.",
    },
    {
      question: 'What does the "Free" badge mean?',
      answer:
        "Providers with the Free badge offer accounts at no cost. These are typically temporary tokens with daily limits.",
    },
  ],
  proxies: [
    {
      question: "Why do I need proxies for SoulFire?",
      answer:
        "When running multiple bots, servers may block your IP. Proxies give each bot a different IP address, avoiding rate limits and IP bans. Learn more in the {guide}.",
      guide: "Proxy Guide",
    },
    {
      question: "What type of proxy should I use?",
      answer:
        "Residential proxies are the hardest to detect but cost more. Datacenter proxies are faster and cheaper but easier to block. ISP proxies offer a middle ground. See the {guide} for recommendations.",
      guide: "Proxy Guide",
    },
    {
      question: 'What does "unlimited bandwidth" mean?',
      answer:
        "Some providers don't charge per GB of data transferred. This is useful for long-running bot sessions that generate lots of traffic.",
    },
    {
      question: "Are these affiliate links?",
      answer:
        "Yes, some links are affiliate links. Purchases through them help fund SoulFire development at no extra cost to you.",
    },
    {
      question: "Can I use free proxies with SoulFire?",
      answer:
        "Some providers like Webshare offer a free tier. Free public proxy lists are not recommended since they're slow, unreliable, and often already blocked.",
    },
  ],
} as const;

type ProviderKind = keyof typeof providerFaqs;

export function createProviderFaqJsonLd(kind: ProviderKind, locale: Locale) {
  const guidePath = localizePath(`/docs/how-to/import-${kind}`, locale);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: providerFaqs[kind].map((item) => ({
      "@type": "Question",
      name: translate(locale, item.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: translate(locale, item.answer, {
          guide:
            "guide" in item
              ? `<a href="https://soulfiremc.com${guidePath}">${translate(locale, item.guide)}</a>`
              : "",
        }),
      },
    })),
  };
}

export function ProviderFaq({ kind }: { kind: ProviderKind }) {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">
          {t("Frequently Asked Questions")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            kind === "accounts"
              ? "Common questions about Minecraft accounts"
              : "Common questions about proxies for SoulFire",
          )}
        </p>
      </div>
      <Accordion className="w-full">
        {providerFaqs[kind].map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger>{t(item.question)}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              <TranslatedMessage
                text={item.answer}
                values={{
                  guide:
                    "guide" in item ? (
                      <Link
                        to="/{-$lang}/docs/$"
                        params={{
                          lang: locale === "en" ? undefined : locale,
                          _splat: `how-to/import-${kind}`,
                        }}
                        className="underline text-primary"
                      >
                        {t(item.guide)}
                      </Link>
                    ) : null,
                }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

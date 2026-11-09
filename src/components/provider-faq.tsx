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
      question: "faq.accounts.whatAreMfaAccounts.question",
      answer: "faq.accounts.whatAreMfaAccounts.answer",
      guide: "faq.accountGuide",
    },
    {
      question: "faq.accounts.whatAreNfaAccounts.question",
      answer: "faq.accounts.whatAreNfaAccounts.answer",
      guide: "faq.accountGuide",
    },
    {
      question: "faq.accounts.whichAccountTypeWorksWithSoulfire.question",
      answer: "faq.accounts.whichAccountTypeWorksWithSoulfire.answer",
      guide: "faq.accountGuide",
    },
    {
      question: "faq.accounts.whatAreTemporaryMinecraftAlts.question",
      answer: "faq.accounts.whatAreTemporaryMinecraftAlts.answer",
    },
    {
      question: "faq.accounts.whatAreTokenAndCookieAccounts.question",
      answer: "faq.accounts.whatAreTokenAndCookieAccounts.answer",
    },
    {
      question: "faq.accounts.whatDoesSfaMean.question",
      answer: "faq.accounts.whatDoesSfaMean.answer",
    },
    {
      question: "faq.accounts.areTheseProvidersAffiliatedWithSoulfire.question",
      answer: "faq.accounts.areTheseProvidersAffiliatedWithSoulfire.answer",
    },
    {
      question: "faq.accounts.whatDoesTheFreeBadgeMean.question",
      answer: "faq.accounts.whatDoesTheFreeBadgeMean.answer",
    },
  ],
  proxies: [
    {
      question: "faq.proxies.whyDoINeedProxiesForSoulfire.question",
      answer: "faq.proxies.whyDoINeedProxiesForSoulfire.answer",
      guide: "faq.proxyGuide",
    },
    {
      question: "faq.proxies.whatTypeOfProxyShouldIUse.question",
      answer: "faq.proxies.whatTypeOfProxyShouldIUse.answer",
      guide: "faq.proxyGuide",
    },
    {
      question: "faq.proxies.whatDoesUnlimitedBandwidthMean.question",
      answer: "faq.proxies.whatDoesUnlimitedBandwidthMean.answer",
    },
    {
      question: "faq.proxies.areTheseAffiliateLinks.question",
      answer: "faq.proxies.areTheseAffiliateLinks.answer",
    },
    {
      question: "faq.proxies.canIUseFreeProxiesWithSoulfire.question",
      answer: "faq.proxies.canIUseFreeProxiesWithSoulfire.answer",
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
        <h2 className="text-2xl font-semibold">{t("faq.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
            kind === "accounts"
              ? "faq.commonQuestionsAboutMinecraftAccounts"
              : "faq.commonQuestionsAboutProxiesForSoulfire",
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

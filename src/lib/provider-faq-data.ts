import { PROVIDERS } from "@/lib/accounts-data";
import { localizePath, type Locale } from "@/lib/i18n";
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
    // Explain the Free badge only while a listing shows it.
    ...(PROVIDERS.some((provider) => provider.badges.includes("free"))
      ? ([
          {
            question: "faq.accounts.whatDoesTheFreeBadgeMean.question",
            answer: "faq.accounts.whatDoesTheFreeBadgeMean.answer",
          },
        ] as const)
      : []),
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

export type ProviderKind = keyof typeof providerFaqs;

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

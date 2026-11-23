import { translate } from "@/lib/messages";
import type { MessageKey } from "@/lib/messages";
import { useLocale, useT } from "@/lib/i18n-react";
import { localizeHref, isLocale } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import type { FAQPage, SoftwareApplication, WithContext } from "schema-dts";
import { HomeFrontpage } from "@/components/home/HomeFrontpage";
import { JsonLd } from "@/components/json-ld";
import { SiteShell } from "@/components/site-shell";
import { getRequiredEnv } from "@/lib/env";
import {
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  jsonLdScript,
} from "@/lib/seo";

const githubLink = getRequiredEnv(
  import.meta.env.VITE_GITHUB_LINK,
  "VITE_GITHUB_LINK",
);

const faqItems: {
  question: MessageKey;
  answerHtml: MessageKey;
}[] = [
  {
    question: "home.whatIsSoulfire",
    answerHtml: "home.soulfireIsAMinecraftBotFrameworkBuiltOnFabric",
  },
  {
    question: "home.isSoulfireFree",
    answerHtml: "home.yesSoulfireIsFreeToUseAndModifyUnder",
  },
  {
    question: "home.whatMinecraftVersionsDoesSoulfireSupport",
    answerHtml: "home.soulfireSupportsClassicAlphaBetaAndCurrentJavaReleases",
  },
  {
    question: "home.canServersDetectSoulfireBots",
    answerHtml: "home.yesSoulfireRunsRealClientCodeButServersCan",
  },
  {
    question: "home.howDoIInstallSoulfire",
    answerHtml: "home.downloadTheInstallerForWindowsMacosOrLinuxIt",
  },
  {
    question: "home.doesSoulfireSupportBedrockEdition",
    answerHtml: "home.yesThroughBuiltInProtocolTranslationBotsCanJoin",
  },
  {
    question: "home.canIWriteCustomPlugins",
    answerHtml: "home.yesPluginsAreFabricModsWithAccessToMinecraft",
  },
  {
    question: "home.canIAutomateBotsWithoutWritingCode",
    answerHtml: "home.yesConnectTriggersActionsAndLogicNodesInThe",
  },
];

function HomePage() {
  const locale = useLocale();
  const t = useT();
  const localizedFaqItems = faqItems.map((item) => {
    const answerHtml = t(item.answerHtml, { github: githubLink }).replaceAll(
      /href="https:\/\/soulfiremc\.com([^" ]*)"/gu,
      (_, path: string) => `href="${localizeHref(path || "/", locale)}"`,
    );
    return {
      question: t(item.question),
      answerHtml,
      answerElement: (
        // oxlint-disable-next-line react/no-danger -- the answer HTML comes from the site's own translation messages
        <div dangerouslySetInnerHTML={{ __html: answerHtml }} />
      ),
    };
  });
  const softwareJsonLd: WithContext<SoftwareApplication> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SoulFire",
    description: t(
      "home.minecraftBotsForServerTestingAutomationAndDevelopment",
    ),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows, macOS, Linux",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    downloadUrl: `https://soulfiremc.com${localizeHref("/download", locale)}`,
    author: {
      "@type": "Organization",
      name: "SoulFire",
      url: `https://soulfiremc.com${localizeHref("/", locale)}`,
    },
    featureList: [
      "Minecraft client code",
      "Multi-version support (Classic to latest)",
      "Visual scripting with triggers, actions, and data nodes",
      "Plugin system",
      "Open source",
      "Cross-platform support",
      "CLI and GUI modes",
      "Bedrock Edition support",
    ],
    url: `https://soulfiremc.com${localizeHref("/", locale)}`,
  };

  const faqJsonLd: WithContext<FAQPage> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: localizedFaqItems.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: item.answerHtml,
      },
    })),
  };

  return (
    <SiteShell>
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd} />
      <HomeFrontpage githubLink={githubLink} faqItems={localizedFaqItems} />
    </SiteShell>
  );
}

export const Route = createFileRoute("/{-$lang}/")({
  head: ({ params }) => {
    const locale = isLocale(params.lang) ? params.lang : "en";
    const title = translate(locale, "home.meta.title");
    const description = translate(locale, "home.meta.description");
    return {
      meta: getPageMeta({
        locale,
        title,
        description,
        path: "/",
        imageUrl: "/og/site/home/image.webp",
        imageAlt: translate(locale, "home.soulfireHomePagePreview"),
      }),
      links: getCanonicalLinks("/", locale),
      scripts: [
        jsonLdScript(
          createStructuredDataGraph([
            createWebPageStructuredData({
              locale,
              path: "/",
              title,
              description,
              imageUrl: "/og/site/home/image.webp",
            }),
          ]),
        ),
      ],
    };
  },
  component: HomePage,
});

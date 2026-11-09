import { useLocale, useT } from "@/lib/i18n-react";
import { localizeHref } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import type {
  BreadcrumbList,
  FAQPage,
  SoftwareApplication,
  WithContext,
} from "schema-dts";
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
  siteDescription,
} from "@/lib/seo";

const githubLink = getRequiredEnv(
  import.meta.env.VITE_GITHUB_LINK,
  "VITE_GITHUB_LINK",
);

const faqItems: {
  question: string;
  answerHtml: string;
}[] = [
  {
    question: "What is SoulFire?",
    answerHtml:
      'SoulFire is a Minecraft bot framework built on Fabric. It runs Minecraft client code for server testing and automation. <a href="https://soulfiremc.com/docs">Read the docs</a>.',
  },
  {
    question: "Is SoulFire free?",
    answerHtml: `Yes. SoulFire is free to use and modify under AGPL-3.0. <a href="https://soulfiremc.com/download">Download it</a> or view the source on <a href="{github}">GitHub</a>.`,
  },
  {
    question: "What Minecraft versions does SoulFire support?",
    answerHtml:
      'SoulFire supports Classic, Alpha, Beta, and current Java releases, plus Combat Snapshots, April Fools versions, and Bedrock Edition. Protocol translation is built in. See the <a href="https://soulfiremc.com/docs/reference/versions">full version list</a>.',
  },
  {
    question: "Can servers detect SoulFire bots?",
    answerHtml:
      "Yes. SoulFire runs real client code, but servers can still detect bots. Use it to test your server's anti-bot and anti-cheat plugins.",
  },
  {
    question: "How do I install SoulFire?",
    answerHtml:
      '<a href="https://soulfiremc.com/download">Download</a> the installer for Windows, macOS, or Linux. It includes Java, so you do not need to install it separately. Follow the <a href="https://soulfiremc.com/docs/start-here">installation guide</a> for setup.',
  },
  {
    question: "Does SoulFire support Bedrock Edition?",
    answerHtml:
      'Yes, through built-in protocol translation. Bots can join, move, and interact with Bedrock servers. Some features are still missing. See <a href="https://soulfiremc.com/docs/reference/versions">supported versions</a> for details.',
  },
  {
    question: "Can I write custom plugins?",
    answerHtml:
      'Yes. Plugins are Fabric mods with access to Minecraft and SoulFire internals. The <a href="https://soulfiremc.com/docs/development">development docs</a> cover low-level hooks, custom settings, Mixins, and direct bot control. Use scripting for high-level automation.',
  },
  {
    question: "Can I automate bots without writing code?",
    answerHtml:
      'Yes. Connect triggers, actions, and logic nodes in the visual editor. It supports real-time debugging and AI/LLM integration. See the <a href="https://soulfiremc.com/docs/scripting">scripting docs</a>.',
  },
];

function HomePage() {
  const locale = useLocale();
  const t = useT();
  const localizedFaqItems = faqItems.map((item) => {
    const answerHtml = t(item.answerHtml, { github: githubLink }).replace(
      /href="https:\/\/soulfiremc\.com([^" ]*)"/g,
      (_, path: string) => `href="${localizeHref(path || "/", locale)}"`,
    );
    return {
      question: t(item.question),
      answerHtml,
      answerElement: <div dangerouslySetInnerHTML={{ __html: answerHtml }} />,
    };
  });
  const softwareJsonLd: WithContext<SoftwareApplication> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SoulFire",
    description:
      "Minecraft bots for server testing, automation, and development.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows, macOS, Linux",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    downloadUrl: `https://soulfiremc.com${localizeHref("/download", locale)}`,
    softwareVersion: "2.0",
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
    screenshot: "https://soulfiremc.com/logo.png",
    url: `https://soulfiremc.com${localizeHref("/", locale)}`,
  };

  softwareJsonLd.description = t(softwareJsonLd.description as string);
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

  const breadcrumbJsonLd: WithContext<BreadcrumbList> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://soulfiremc.com",
      },
    ],
  };

  return (
    <SiteShell>
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <HomeFrontpage githubLink={githubLink} faqItems={localizedFaqItems} />
    </SiteShell>
  );
}

export const Route = createFileRoute("/{-$lang}/")({
  head: ({ params }) => ({
    meta: getPageMeta({
      locale: isLocale(params.lang) ? params.lang : "en",
      title: "SoulFire - Minecraft bots for testing and automation",
      description: siteDescription,
      path: "/",
      imageUrl: "/og/site/home/image.webp",
      imageAlt: "SoulFire home page preview",
    }),
    links: getCanonicalLinks("/", isLocale(params.lang) ? params.lang : "en"),
    scripts: [
      jsonLdScript(
        createStructuredDataGraph([
          createWebPageStructuredData({
            locale: isLocale(params.lang) ? params.lang : "en",
            path: "/",
            title: "SoulFire - Minecraft bots for testing and automation",
            description: siteDescription,
            imageUrl: "/og/site/home/image.webp",
          }),
        ]),
      ),
    ],
  }),
  component: HomePage,
});

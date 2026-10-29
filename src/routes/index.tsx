import { createFileRoute, Link } from "@tanstack/react-router";
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
  answerElement: React.ReactNode;
}[] = [
  {
    question: "What is SoulFire?",
    answerHtml:
      'SoulFire is a Minecraft bot framework built on Fabric. It runs Minecraft client code for server testing and automation. <a href="https://soulfiremc.com/docs">Read the docs</a>.',
    answerElement: (
      <>
        SoulFire is a Minecraft bot framework built on Fabric. It runs Minecraft
        client code for server testing and automation.{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "" }}
          className="underline text-primary"
        >
          Read the docs
        </Link>
        .
      </>
    ),
  },
  {
    question: "Is SoulFire free?",
    answerHtml: `Yes. SoulFire is free to use and modify under AGPL-3.0. <a href="https://soulfiremc.com/download">Download it</a> or view the source on <a href="${githubLink}">GitHub</a>.`,
    answerElement: (
      <>
        Yes. SoulFire is free to use and modify under AGPL-3.0.{" "}
        <Link to="/download" className="underline text-primary">
          Download it
        </Link>{" "}
        or view the source on{" "}
        <a
          href={githubLink}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary"
        >
          GitHub
        </a>
        .
      </>
    ),
  },
  {
    question: "What Minecraft versions does SoulFire support?",
    answerHtml:
      'SoulFire supports Classic, Alpha, Beta, and current Java releases, plus Combat Snapshots, April Fools versions, and Bedrock Edition. Protocol translation is built in. See the <a href="https://soulfiremc.com/docs/reference/versions">full version list</a>.',
    answerElement: (
      <>
        SoulFire supports Classic, Alpha, Beta, and current Java releases, plus
        Combat Snapshots, April Fools versions, and Bedrock Edition. Protocol
        translation is built in. See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "reference/versions" }}
          className="underline text-primary"
        >
          full version list
        </Link>
        .
      </>
    ),
  },
  {
    question: "Can servers detect SoulFire bots?",
    answerHtml:
      "Yes. SoulFire runs real client code, but servers can still detect bots. Use it to test your server's anti-bot and anti-cheat plugins.",
    answerElement: (
      <>
        Yes. SoulFire runs real client code, but servers can still detect bots.
        Use it to test your server's anti-bot and anti-cheat plugins.
      </>
    ),
  },
  {
    question: "How do I install SoulFire?",
    answerHtml:
      '<a href="https://soulfiremc.com/download">Download</a> the installer for Windows, macOS, or Linux. It includes Java, so you do not need to install it separately. Follow the <a href="https://soulfiremc.com/docs/start-here">installation guide</a> for setup.',
    answerElement: (
      <>
        <Link to="/download" className="underline text-primary">
          Download
        </Link>{" "}
        the installer for Windows, macOS, or Linux. It includes Java, so you do
        not need to install it separately. Follow the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "start-here" }}
          className="underline text-primary"
        >
          installation guide
        </Link>{" "}
        for setup.
      </>
    ),
  },
  {
    question: "Does SoulFire support Bedrock Edition?",
    answerHtml:
      'Yes, through built-in protocol translation. Bots can join, move, and interact with Bedrock servers. Some features are still missing. See <a href="https://soulfiremc.com/docs/reference/versions">supported versions</a> for details.',
    answerElement: (
      <>
        Yes, through built-in protocol translation. Bots can join, move, and
        interact with Bedrock servers. Some features are still missing. See{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "reference/versions" }}
          className="underline text-primary"
        >
          supported versions
        </Link>{" "}
        for details.
      </>
    ),
  },
  {
    question: "Can I write custom plugins?",
    answerHtml:
      'Yes. Plugins are Fabric mods with access to Minecraft and SoulFire internals. The <a href="https://soulfiremc.com/docs/development">development docs</a> cover low-level hooks, custom settings, Mixins, and direct bot control. Use scripting for high-level automation.',
    answerElement: (
      <>
        Yes. Plugins are Fabric mods with access to Minecraft and SoulFire
        internals. The{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "development" }}
          className="underline text-primary"
        >
          development docs
        </Link>{" "}
        cover low-level hooks, custom settings, Mixins, and direct bot control.
        Use scripting for high-level automation.
      </>
    ),
  },
  {
    question: "Can I automate bots without writing code?",
    answerHtml:
      'Yes. Connect triggers, actions, and logic nodes in the visual editor. It supports real-time debugging and AI/LLM integration. See the <a href="https://soulfiremc.com/docs/scripting">scripting docs</a>.',
    answerElement: (
      <>
        Yes. Connect triggers, actions, and logic nodes in the visual editor. It
        supports real-time debugging and AI/LLM integration. See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "scripting" }}
          className="underline text-primary"
        >
          scripting docs
        </Link>
        .
      </>
    ),
  },
];

function HomePage() {
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
    downloadUrl: "https://soulfiremc.com/download",
    softwareVersion: "2.0",
    author: {
      "@type": "Organization",
      name: "SoulFire",
      url: "https://soulfiremc.com",
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
    url: "https://soulfiremc.com",
  };

  const faqJsonLd: WithContext<FAQPage> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
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
      <HomeFrontpage githubLink={githubLink} faqItems={faqItems} />
    </SiteShell>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: getPageMeta({
      title: "SoulFire - Minecraft bots for testing and automation",
      description: siteDescription,
      path: "/",
      imageUrl: "/og/site/home/image.webp",
      imageAlt: "SoulFire home page preview",
    }),
    links: getCanonicalLinks("/"),
    scripts: [
      jsonLdScript(
        createStructuredDataGraph([
          createWebPageStructuredData({
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

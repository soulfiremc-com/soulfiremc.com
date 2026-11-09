import type { MessageKey } from "@/lib/messages";
import { useT } from "@/lib/i18n-react";
import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Box,
  Check,
  Code2,
  Download,
  Globe2,
  Play,
  Terminal,
  Workflow,
} from "lucide-react";
import {
  LazyMotion,
  domAnimation,
  m,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { EnderDashSponsor } from "@/components/enderdash-sponsor";
import { SdkCode } from "@/components/SdkCode";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRequiredEnv } from "@/lib/env";
import { VoxelScene } from "./VoxelScene";

function TranslatedLines({
  text,
  accent = false,
}: {
  text: MessageKey;
  accent?: boolean;
}) {
  const t = useT();
  const lines = t(text).split("\n");
  return lines.map((line) => (
    <Fragment key={line}>
      {line !== lines[0] && <br />}
      {accent && line !== lines[0] ? <span>{line}</span> : line}
    </Fragment>
  ));
}

function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={false}
      whileInView={{ opacity: [0.65, 1], y: reducedMotion ? 0 : [16, 0] }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

function DemoVideo() {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="lg">
            <Play data-icon="inline-start" />
            {t("home.watchDemo")}
          </Button>
        }
      />
      <DialogContent
        ref={dialogRef}
        className="overflow-hidden sm:max-w-5xl"
        initialFocus={dialogRef}
      >
        <DialogTitle className="sr-only">
          {t("home.soulfireWalkthrough")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("home.watchTheSoulfireDemoOnYoutube")}
        </DialogDescription>
        {open && (
          <iframe
            className="aspect-video w-full"
            src="https://www.youtube-nocookie.com/embed/BD-xE8vbHtQ"
            title={t("home.soulfireWalkthrough")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const capabilities = [
  {
    icon: Box,
    title: "home.realMinecraftClients",
    text: "home.builtOnFabricSoBotsUseMinecraftSOwn",
    link: "home.howSoulfireWorks",
    path: "concepts",
  },
  {
    icon: Globe2,
    title: "home.javaAndBedrock",
    text: "home.connectToVersionsFromClassicThroughTheLatestRelease",
    link: "home.supportedVersions",
    path: "reference/versions",
  },
  {
    icon: Blocks,
    title: "home.addYourOwnPlugins",
    text: "home.enableTheBuiltInPluginsOrWriteAFabric",
    link: "home.buildAPlugin",
    path: "development",
  },
] as const;

function ScriptPreview() {
  const t = useT();
  return (
    <div
      className="workflow-preview"
      role="img"
      aria-label={t("home.aVisualScriptConnectsAnOnChatTriggerTo")}
    >
      <div className="workflow-title">
        <Workflow className="size-4" />
        <span>{"hello-world.sfscript"}</span>
        <span>{t("home.visualScript")}</span>
      </div>
      <div className="workflow-canvas">
        <svg
          viewBox="0 0 560 270"
          className="workflow-wires"
          aria-hidden="true"
        >
          <path d="M164 90 C210 90 196 157 242 157 M372 157 C410 157 397 88 435 88" />
          <path
            className="workflow-signal"
            d="M164 90 C210 90 196 157 242 157 M372 157 C410 157 397 88 435 88"
          />
        </svg>
        <div className="workflow-node workflow-trigger">
          <span>{t("home.trigger")}</span>
          <strong>{t("home.onChat")}</strong>
          <p>
            {t("home.messageReceived")} <i />
          </p>
        </div>
        <div className="workflow-node workflow-condition">
          <span>{t("home.condition")}</span>
          <strong>{t("home.contains")}</strong>
          <p>
            <i /> {t("home.message")} <code>hello</code>
            <i />
          </p>
        </div>
        <div className="workflow-node workflow-action">
          <span>{t("home.action")}</span>
          <strong>{t("home.sendChat")}</strong>
          <p>
            <i /> {t("home.helloWorld")}
          </p>
        </div>
      </div>
      <div className="workflow-result">
        <Check className="size-3.5" />
        <span>{t("home.repliesWhenSomeoneSaysHello")}</span>
        <code>{t("home.noCodeNeeded")}</code>
      </div>
    </div>
  );
}

function AutomationSection() {
  const t = useT();
  return (
    <section
      className="home-section home-automation"
      id="automation"
      aria-labelledby="automation-title"
    >
      <Reveal className="home-section-copy">
        <h2 id="automation-title">
          <TranslatedLines text={"home.giveYourBotsAJob"} />
        </h2>
        <p>{t("home.connectEventsToActionsInTheVisualEditorTo")}</p>
        <Link
          to="/{-$lang}/docs/$"
          params={{ _splat: "scripting" }}
          className="home-text-link"
        >
          {t("home.scriptingGuide")}
          <ArrowUpRight className="size-4" />
        </Link>
      </Reveal>
      <Reveal className="home-automation-demo">
        <Tabs defaultValue="visual">
          <TabsList variant="line" aria-label={t("home.automationExamples")}>
            <TabsTrigger value="visual">
              <Workflow />
              {t("home.visualScripting")}
            </TabsTrigger>
            <TabsTrigger value="terminal">
              <Terminal />
              {t("home.terminal")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="visual">
            <ScriptPreview />
          </TabsContent>
          <TabsContent value="terminal">
            <div className="terminal-preview">
              <div className="workflow-title">
                <Terminal className="size-4" />
                <span>{"SoulFire CLI"}</span>
                <span>{t("home.exampleSession")}</span>
              </div>
              <pre>
                <code>
                  <span className="terminal-comment">
                    # Start a session on your server
                  </span>
                  {"\n"}
                  <span className="terminal-prompt">❯ </span>java -jar
                  SoulFireCLI.jar \{"\n"}
                  {"  "}--address localhost --amount 36 --start{"\n\n"}
                  <span className="terminal-comment">
                    # Move the connected bots together
                  </span>
                  {"\n"}
                  <span className="terminal-prompt">❯ </span>move 578 65 100
                  {"\n"}
                  <span className="terminal-response">
                    Moving bots to 578, 65, 100.
                  </span>
                </code>
              </pre>
              <Link
                to="/{-$lang}/docs/$"
                params={{ _splat: "reference/commands" }}
                className="terminal-docs"
              >
                {t("home.commandReference")}
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </Reveal>
    </section>
  );
}

function SdkSection() {
  const t = useT();
  return (
    <section
      className="home-section home-sdk"
      id="sdks"
      aria-labelledby="sdk-title"
    >
      <Reveal className="home-section-heading">
        <div>
          <Code2 className="home-section-icon" />
          <h2 id="sdk-title">
            <TranslatedLines text={"home.typescriptAndPythonSdks"} />
          </h2>
        </div>
        <p>{t("home.startWithAServerAddressAndUsernameTheSdk")}</p>
      </Reveal>
      <Reveal>
        <div className="home-code-tabs">
          <Tabs defaultValue="typescript">
            <div className="home-code-bar">
              <TabsList variant="line" aria-label={t("home.sdkLanguage")}>
                <TabsTrigger value="typescript">{"TypeScript"}</TabsTrigger>
                <TabsTrigger value="python">{"Python"}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="typescript">
              <div className="home-code-content">
                <div className="home-code-info">
                  <h3>{t("home.typescriptWithEffect")}</h3>
                  <p>
                    {t(
                      "home.effectScopesCloseBotConnectionsWhenTheWorkflowEnds",
                    )}
                  </p>
                  <code>bun add @soulfiremc/sdk effect</code>
                  <Link
                    to="/{-$lang}/docs/$"
                    params={{ _splat: "sdk/typescript" }}
                    className="home-text-link"
                  >
                    {t("home.typescriptDocs")}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
                <SdkCode language="typescript" />
              </div>
            </TabsContent>
            <TabsContent value="python">
              <div className="home-code-content">
                <div className="home-code-info">
                  <h3>{t("home.pythonWithEffectPy")}</h3>
                  <p>{t("home.useEffectPyForBotOperationsAndScopedCleanup")}</p>
                  <code>pip install soulfire</code>
                  <Link
                    to="/{-$lang}/docs/$"
                    params={{ _splat: "sdk/python" }}
                    className="home-text-link"
                  >
                    {t("home.pythonDocs")}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
                <SdkCode language="python" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Reveal>
    </section>
  );
}

export function HomeFrontpage({
  githubLink,
  faqItems,
}: {
  githubLink: string;
  faqItems: { question: string; answerElement: ReactNode }[];
}) {
  const t = useT();
  const reducedMotion = useReducedMotion();
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="soulfire-home">
          <section className="home-hero" aria-labelledby="hero-title">
            <div className="home-hero-inner">
              <m.div
                className="home-hero-copy"
                initial={false}
                animate={{ opacity: [0, 1], y: reducedMotion ? 0 : [18, 0] }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <a href={githubLink} className="home-source-link">
                  <SiGithub className="size-4" />
                  {t("home.openSourceOnGithub")}
                  <ArrowUpRight className="size-3.5" />
                </a>
                <h1 id="hero-title">
                  <TranslatedLines text={"home.putBotsToWork"} accent />
                </h1>
                <p>
                  {t("home.stressTestYourMinecraftServerAutomateTasksWithReal")}
                </p>
                <div className="home-hero-actions">
                  <Button
                    render={
                      <Link to="/{-$lang}/download">
                        <Download data-icon="inline-start" />
                        {t("download.title")}
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    }
                    nativeButton={false}
                    size="lg"
                  />
                  <DemoVideo />
                </div>
                <p className="home-platforms">
                  {t("home.freeForWindowsMacosAndLinux")}
                </p>
              </m.div>
              <VoxelScene />
            </div>
            <div className="home-hero-footer">
              <span>{t("home.builtOnFabric")}</span>
              <a href="#features">
                {t("home.howItWorks")}
                <ArrowDown className="size-3.5" />
              </a>
            </div>
          </section>

          <div className="home-body">
            <section
              className="home-section"
              id="features"
              aria-labelledby="intro-title"
            >
              <Reveal className="home-section-heading">
                <h2 id="intro-title">
                  <TranslatedLines text={"home.seeHowYourServerHoldsUp"} />
                </h2>
                <p>{t("home.findOutHowYourServerHandlesPlayersJoiningAnd")}</p>
              </Reveal>
              <div className="home-capabilities">
                {capabilities.map(({ icon: Icon, title, text, link, path }) => (
                  <Reveal key={title}>
                    <article>
                      <Icon className="home-capability-icon" />
                      <h3>{t(title)}</h3>
                      <p>{t(text)}</p>
                      <Link
                        to="/{-$lang}/docs/$"
                        params={{ _splat: path }}
                        className="home-text-link"
                      >
                        {t(link)}
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </article>
                  </Reveal>
                ))}
              </div>
            </section>
            <AutomationSection />
            <SdkSection />
            <section
              className="home-section home-community"
              aria-labelledby="community-title"
            >
              <Reveal>
                <SiGithub className="home-community-icon" />
                <h2 id="community-title">
                  <TranslatedLines text={"home.comeBuildWithUs"} />
                </h2>
                <p>{t("home.shareYourScriptsAndGetHelpOnDiscordIf")}</p>
                <div className="home-community-actions">
                  <Button
                    render={
                      <a href={githubLink}>
                        <SiGithub data-icon="inline-start" />
                        {t("home.viewOnGithub")}
                        <ArrowUpRight data-icon="inline-end" />
                      </a>
                    }
                    nativeButton={false}
                    variant="outline"
                    size="lg"
                  />
                  <Button
                    render={
                      <a
                        href={getRequiredEnv(
                          import.meta.env.VITE_DISCORD_LINK,
                          "VITE_DISCORD_LINK",
                        )}
                      >
                        <SiDiscord data-icon="inline-start" />
                        {t("home.joinDiscord")}
                      </a>
                    }
                    nativeButton={false}
                    variant="ghost"
                    size="lg"
                  />
                </div>
                <span className="home-mono">
                  {t("home.freeAndOpenSourceUnderAgpl30")}
                </span>
              </Reveal>
            </section>
            <section
              className="home-section home-faq"
              aria-labelledby="faq-title"
            >
              <Reveal className="home-section-copy">
                <h2 id="faq-title">{t("home.commonQuestions")}</h2>
                <p>
                  {t(
                    "home.theSetupGuideCoversInstallationAndYourFirstConnection",
                  )}
                </p>
                <Link
                  to="/{-$lang}/docs/$"
                  params={{ _splat: "start-here" }}
                  className="home-text-link"
                >
                  {t("home.installationGuide")}
                  <ArrowUpRight className="size-4" />
                </Link>
              </Reveal>
              <Accordion>
                {faqItems.map(({ question, answerElement }) => (
                  <AccordionItem key={question} value={question}>
                    <AccordionTrigger>{question}</AccordionTrigger>
                    <AccordionContent>{answerElement}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
            <div className="home-sponsor">
              <EnderDashSponsor placement="homepage" />
            </div>
            <section
              className="home-section home-final"
              aria-labelledby="final-title"
            >
              <Reveal>
                <h2 id="final-title">
                  <TranslatedLines text={"home.startYourFirstSession"} />
                </h2>
                <div className="home-final-actions">
                  <Button
                    render={
                      <Link to="/{-$lang}/download">
                        <Download data-icon="inline-start" />
                        {t("download.title")}
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    }
                    nativeButton={false}
                    size="lg"
                  />
                  <Link
                    to="/{-$lang}/docs/$"
                    params={{ _splat: "" }}
                    className="home-text-link"
                  >
                    {t("home.readTheDocs")}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </Reveal>
              <img
                src="/logo-square.svg"
                width="180"
                height="180"
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
            </section>
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

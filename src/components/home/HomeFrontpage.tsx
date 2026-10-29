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
import { useRef, useState, type ReactNode } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="lg">
          <Play data-icon="inline-start" />
          Watch demo
        </Button>
      </DialogTrigger>
      <DialogContent
        ref={dialogRef}
        className="overflow-hidden sm:max-w-5xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dialogRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">SoulFire walkthrough</DialogTitle>
        <DialogDescription className="sr-only">
          Watch the SoulFire demo on YouTube.
        </DialogDescription>
        {open && (
          <iframe
            className="aspect-video w-full"
            src="https://www.youtube-nocookie.com/embed/BD-xE8vbHtQ"
            title="SoulFire walkthrough"
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
    title: "Real Minecraft clients",
    text: "Built on Fabric, so bots use Minecraft's own physics and networking.",
    link: "How SoulFire works",
    path: "concepts",
  },
  {
    icon: Globe2,
    title: "Java and Bedrock",
    text: "Connect to versions from Classic through the latest release. SoulFire translates the protocol for you.",
    link: "Supported versions",
    path: "reference/versions",
  },
  {
    icon: Blocks,
    title: "Add your own plugins",
    text: "Enable the built-in plugins or write a Fabric mod to control bots through the API.",
    link: "Build a plugin",
    path: "development",
  },
];

function ScriptPreview() {
  return (
    <div
      className="workflow-preview"
      role="img"
      aria-label="A visual script connects an On Chat trigger to a message check, then sends a reply when the message contains hello."
    >
      <div className="workflow-title">
        <Workflow className="size-4" />
        <span>hello-world.sfscript</span>
        <span>Visual script</span>
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
          <span>Trigger</span>
          <strong>On Chat</strong>
          <p>
            Message received <i />
          </p>
        </div>
        <div className="workflow-node workflow-condition">
          <span>Condition</span>
          <strong>Contains</strong>
          <p>
            <i /> Message <code>hello</code>
            <i />
          </p>
        </div>
        <div className="workflow-node workflow-action">
          <span>Action</span>
          <strong>Send Chat</strong>
          <p>
            <i /> Hello, world!
          </p>
        </div>
      </div>
      <div className="workflow-result">
        <Check className="size-3.5" />
        <span>Replies when someone says hello</span>
        <code>No code needed</code>
      </div>
    </div>
  );
}

function AutomationSection() {
  return (
    <section
      className="home-section home-automation"
      id="automation"
      aria-labelledby="automation-title"
    >
      <Reveal className="home-section-copy">
        <h2 id="automation-title">
          Give your bots
          <br />
          a job.
        </h2>
        <p>
          Connect events to actions in the visual editor to build a routine your
          bots can follow. Use the CLI for commands across all connected bots.
        </p>
        <Link
          to="/docs/$"
          params={{ _splat: "scripting" }}
          className="home-text-link"
        >
          Scripting guide
          <ArrowUpRight className="size-4" />
        </Link>
      </Reveal>
      <Reveal className="home-automation-demo">
        <Tabs defaultValue="visual">
          <TabsList variant="line" aria-label="Automation examples">
            <TabsTrigger value="visual">
              <Workflow />
              Visual scripting
            </TabsTrigger>
            <TabsTrigger value="terminal">
              <Terminal />
              Terminal
            </TabsTrigger>
          </TabsList>
          <TabsContent value="visual">
            <ScriptPreview />
          </TabsContent>
          <TabsContent value="terminal">
            <div className="terminal-preview">
              <div className="workflow-title">
                <Terminal className="size-4" />
                <span>SoulFire CLI</span>
                <span>Example session</span>
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
                to="/docs/$"
                params={{ _splat: "reference/commands" }}
                className="terminal-docs"
              >
                Command reference
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
            TypeScript and
            <br />
            Python SDKs
          </h2>
        </div>
        <p>
          Start with a server address and username. The SDK handles account
          setup and state sync, so you can focus on what your bot does.
        </p>
      </Reveal>
      <Reveal>
        <div className="home-code-tabs">
          <Tabs defaultValue="typescript">
            <div className="home-code-bar">
              <TabsList variant="line" aria-label="SDK language">
                <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="typescript">
              <div className="home-code-content">
                <div className="home-code-info">
                  <h3>TypeScript with Effect</h3>
                  <p>
                    Effect scopes close bot connections when the workflow ends.
                  </p>
                  <code>bun add @soulfiremc/sdk effect</code>
                  <Link
                    to="/docs/$"
                    params={{ _splat: "sdk/typescript" }}
                    className="home-text-link"
                  >
                    TypeScript docs
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
                <SdkCode language="typescript" />
              </div>
            </TabsContent>
            <TabsContent value="python">
              <div className="home-code-content">
                <div className="home-code-info">
                  <h3>Python with effect-py</h3>
                  <p>Use effect-py for bot operations and scoped cleanup.</p>
                  <code>pip install soulfire</code>
                  <Link
                    to="/docs/$"
                    params={{ _splat: "sdk/python" }}
                    className="home-text-link"
                  >
                    Python docs
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
                  Open source on GitHub
                  <ArrowUpRight className="size-3.5" />
                </a>
                <h1 id="hero-title">
                  Put bots
                  <br />
                  <span>to work.</span>
                </h1>
                <p>
                  Stress test your Minecraft server or automate the repetitive
                  work. SoulFire bots run real client code, with visual
                  scripting and SDKs.
                </p>
                <div className="home-hero-actions">
                  <Button asChild size="lg">
                    <Link to="/download">
                      <Download data-icon="inline-start" />
                      Download SoulFire
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <DemoVideo />
                </div>
                <p className="home-platforms">
                  Free for Windows, macOS, and Linux.
                </p>
              </m.div>
              <VoxelScene />
            </div>
            <div className="home-hero-footer">
              <span>Built on Fabric</span>
              <a href="#features">
                How it works
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
                  See how your
                  <br />
                  server holds up.
                </h2>
                <p>
                  Find out how your server handles players joining and
                  interacting before your next busy session.
                </p>
              </Reveal>
              <div className="home-capabilities">
                {capabilities.map(({ icon: Icon, title, text, link, path }) => (
                  <Reveal key={title}>
                    <article>
                      <Icon className="home-capability-icon" />
                      <h3>{title}</h3>
                      <p>{text}</p>
                      <Link
                        to="/docs/$"
                        params={{ _splat: path }}
                        className="home-text-link"
                      >
                        {link}
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
                  Come build
                  <br />
                  with us.
                </h2>
                <p>
                  Share your scripts and get help on Discord. If you've found a
                  bug or have a fix, head to GitHub.
                </p>
                <div className="home-community-actions">
                  <Button asChild variant="outline" size="lg">
                    <a href={githubLink}>
                      <SiGithub data-icon="inline-start" />
                      View on GitHub
                      <ArrowUpRight data-icon="inline-end" />
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="lg">
                    <a
                      href={getRequiredEnv(
                        import.meta.env.VITE_DISCORD_LINK,
                        "VITE_DISCORD_LINK",
                      )}
                    >
                      <SiDiscord data-icon="inline-start" />
                      Join Discord
                    </a>
                  </Button>
                </div>
                <span className="home-mono">
                  Free and open source under AGPL-3.0
                </span>
              </Reveal>
            </section>
            <section
              className="home-section home-faq"
              aria-labelledby="faq-title"
            >
              <Reveal className="home-section-copy">
                <h2 id="faq-title">Common questions</h2>
                <p>
                  The setup guide covers installation and your first connection.
                </p>
                <Link
                  to="/docs/$"
                  params={{ _splat: "start-here" }}
                  className="home-text-link"
                >
                  Installation guide
                  <ArrowUpRight className="size-4" />
                </Link>
              </Reveal>
              <Accordion type="single" collapsible>
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
                  Start your
                  <br />
                  first session.
                </h2>
                <div className="home-final-actions">
                  <Button asChild size="lg">
                    <Link to="/download">
                      <Download data-icon="inline-start" />
                      Download SoulFire
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Link
                    to="/docs/$"
                    params={{ _splat: "" }}
                    className="home-text-link"
                  >
                    Read the docs
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

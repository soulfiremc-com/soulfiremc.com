import { SiGithub } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CircuitBoard,
  Coffee,
  Cpu,
  Download,
  Heart,
  PlayCircle,
  Server,
  Terminal,
} from "lucide-react";
import {
  createLoader,
  createStandardSchemaV1,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { Suspense, useEffect, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { CustomTimeAgo } from "@/components/time-ago";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createClientDownloads,
  createServerDownloads,
  type DownloadLinkMap,
} from "@/lib/download-links";
import { getClientReleaseManifest, getServerVersion } from "@/lib/releases";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const FALLBACK_CPU = {
  id: "x64",
  label: "x86_64 / AMD64",
  detail: "Intel or AMD processors",
  icon: "cpu",
} as const;

const ARM_CPU = {
  id: "arm64",
  label: "AArch64 / ARM64",
  detail: "Apple Silicon or ARM servers",
  icon: "circuit",
} as const;

const WINDOWS_OPTION = {
  id: "windows",
  label: "Windows",
  detail: "Windows 10 or newer",
  iconSrc: "/platform/windows.png",
  iconAlt: "Windows",
  preferredCpuId: FALLBACK_CPU.id,
} as const;

const OS_OPTIONS = [
  WINDOWS_OPTION,
  {
    id: "macos",
    label: "macOS",
    detail: "Apple Silicon & Intel",
    iconSrc: "/platform/macos.png",
    iconAlt: "macOS",
    preferredCpuId: ARM_CPU.id,
  },
  {
    id: "linux",
    label: "Linux",
    detail: "Most distros supported",
    iconSrc: "/platform/linux.png",
    iconAlt: "Linux",
    preferredCpuId: FALLBACK_CPU.id,
  },
] as const;

type OsOption = (typeof OS_OPTIONS)[number];

const CPU_OPTIONS = [FALLBACK_CPU, ARM_CPU] as const;

const DEFAULT_OS = WINDOWS_OPTION;
const DEFAULT_CPU = FALLBACK_CPU;
type CpuOption = (typeof CPU_OPTIONS)[number];

const PREFERRED_CPU_BY_OS = OS_OPTIONS.reduce(
  (acc, option) => {
    acc[option.id] = option.preferredCpuId;
    return acc;
  },
  {} as Record<OsOption["id"], CpuOption["id"]>,
);

const OS_IDS = OS_OPTIONS.map((option) => option.id);

const CPU_IDS = CPU_OPTIONS.map((option) => option.id);

const downloadSearchParams = {
  os: parseAsStringLiteral(OS_IDS).withDefault(DEFAULT_OS.id),
  cpu: parseAsStringLiteral(CPU_IDS).withDefault(DEFAULT_CPU.id),
};

const loadDownloadSearchParams = createLoader(downloadSearchParams);
const validateDownloadSearch = createStandardSchemaV1(downloadSearchParams, {
  partialOutput: true,
});

type DownloadSelection = Awaited<ReturnType<typeof loadDownloadSearchParams>>;

function detectBrowserOS(): OsOption["id"] | null {
  if (typeof window === "undefined") return null;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? "";

  // Check for Windows
  if (userAgent.includes("win") || platform.includes("win")) {
    return "windows";
  }

  // Check for macOS
  if (
    userAgent.includes("mac") ||
    platform.includes("mac") ||
    platform.includes("iphone") ||
    platform.includes("ipad")
  ) {
    return "macos";
  }

  // Check for Linux (including Android which is Linux-based, but we'll treat as Linux)
  if (
    userAgent.includes("linux") ||
    userAgent.includes("x11") ||
    platform.includes("linux")
  ) {
    return "linux";
  }

  return null;
}

function detectBrowserCPU(): CpuOption["id"] | null {
  if (typeof window === "undefined") return null;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? "";

  // Check for ARM architecture
  // Common indicators: aarch64, arm64, arm in platform/userAgent
  if (
    platform.includes("aarch64") ||
    platform.includes("arm64") ||
    platform.includes("arm") ||
    userAgent.includes("aarch64") ||
    userAgent.includes("arm64")
  ) {
    return "arm64";
  }

  // Check for x86_64/AMD64 architecture
  // Common indicators: x86_64, x64, amd64, win64, wow64 (Windows 64-bit), x86_64 in platform
  if (
    platform.includes("x86_64") ||
    platform.includes("x64") ||
    platform.includes("amd64") ||
    platform.includes("win64") ||
    userAgent.includes("x86_64") ||
    userAgent.includes("x64") ||
    userAgent.includes("amd64") ||
    userAgent.includes("win64") ||
    userAgent.includes("wow64")
  ) {
    return "x64";
  }

  // For macOS, we can use navigator.userAgentData if available (Chromium browsers)
  // to detect Apple Silicon vs Intel
  const userAgentData = (navigator as NavigatorWithUAData).userAgentData;
  if (userAgentData?.getHighEntropyValues) {
    // This is async, so we can't use it directly here
    // But we can check platform hints synchronously if available
    if (userAgentData.platform === "macOS") {
      // On macOS, if we can't detect ARM, assume Apple Silicon for newer browsers
      // since most new Macs are ARM-based
      // However, this is a heuristic and may not be accurate
    }
  }

  // Default: return null to use OS-based preference
  return null;
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    platform?: string;
    getHighEntropyValues?: (
      hints: string[],
    ) => Promise<{ architecture?: string }>;
  };
}

function DownloadSelectionComponent({
  clientDownloads,
}: {
  clientDownloads: DownloadLinkMap;
}) {
  const search = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const searchParams = new URLSearchParams(search);
  const selection = loadDownloadSearchParams(searchParams);

  // Check if the user explicitly set search params
  const hasExplicitParams = searchParams.has("os") || searchParams.has("cpu");

  return (
    <>
      <DownloadConfigurator
        links={clientDownloads}
        initialSelection={selection}
        hasExplicitParams={hasExplicitParams}
      />
      <DownloadTip selection={selection} />
    </>
  );
}

function DownloadConfigurator(props: {
  links: DownloadLinkMap;
  initialSelection: DownloadSelection;
  hasExplicitParams: boolean;
}) {
  const [{ os, cpu }, setSelection] = useQueryStates(downloadSearchParams, {
    history: "replace",
    shallow: false,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasAppliedOsDetection, setHasAppliedOsDetection] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  // Apply OS and CPU detection on initial hydration if no explicit params were provided
  useEffect(() => {
    if (!hasAppliedOsDetection && !props.hasExplicitParams) {
      const detectedOs = detectBrowserOS();
      const detectedCpu = detectBrowserCPU();

      if (detectedOs) {
        setSelection({
          os: detectedOs,
          // Use detected CPU if available, otherwise fall back to OS preference
          cpu: detectedCpu ?? PREFERRED_CPU_BY_OS[detectedOs],
        });
      } else if (detectedCpu) {
        // If we only detected CPU but not OS, just update CPU
        setSelection((prev) => ({
          ...prev,
          cpu: detectedCpu,
        }));
      }
      setHasAppliedOsDetection(true);
    }
    setIsHydrated(true);
  }, [hasAppliedOsDetection, props.hasExplicitParams, setSelection]);

  const selection = isHydrated ? { os, cpu } : props.initialSelection;

  const downloadHref = props.links[selection.os]?.[selection.cpu];
  const isDirectGithubDownload = downloadHref?.includes("github.com") ?? false;

  const handleOsChange = (value: typeof selection.os) => {
    setSelection((prev) => ({
      ...prev,
      os: value,
      cpu: PREFERRED_CPU_BY_OS[value],
    }));
  };

  const handleCpuChange = (value: typeof selection.cpu) => {
    setSelection((prev) => ({
      ...prev,
      cpu: value,
    }));
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Choose your build</CardTitle>
        <CardDescription>
          SoulFire is multi-platform. Tell us what you are running and we will
          point you to the best download.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Operating system
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {OS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOsChange(option.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition hover:border-primary/60",
                  selection.os === option.id
                    ? "border-primary bg-primary/10"
                    : "bg-background",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <img
                      src={option.iconSrc}
                      alt={option.iconAlt}
                      className="size-7"
                    />
                  </div>
                  <div>
                    <div className="text-base font-semibold">
                      {option.label}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {option.detail}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            CPU architecture
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CPU_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleCpuChange(option.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition hover:border-primary/60",
                  selection.cpu === option.id
                    ? "border-primary bg-primary/10"
                    : "bg-background",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {option.icon === "cpu" ? (
                      <Cpu className="h-5 w-5 text-primary" />
                    ) : (
                      <CircuitBoard className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="text-base font-semibold">
                      {option.label}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {option.detail}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        {downloadHref ? (
          <Button
            size="lg"
            className="w-full gap-2 text-xs sm:text-sm"
            onClick={() => {
              setShowThankYou(true);
              // Trigger the download programmatically
              const link = document.createElement("a");
              link.href = downloadHref;
              if (isDirectGithubDownload) {
                link.download = "";
              } else {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
              }
              link.click();
            }}
          >
            <Download className="h-5 w-5" />
            Download
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full gap-2 text-xs sm:text-sm"
            disabled
          >
            <Download className="h-5 w-5" />
            Coming soon
          </Button>
        )}
      </CardContent>
      <Credenza open={showThankYou} onOpenChange={setShowThankYou}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Thank you for downloading!
            </CredenzaTitle>
            <CredenzaDescription>
              Your download should start shortly. If it doesn&apos;t,{" "}
              <a
                href={downloadHref ?? "#"}
                className="underline text-primary"
                {...(isDirectGithubDownload
                  ? { download: "" }
                  : { target: "_blank", rel: "noopener noreferrer" })}
              >
                retry the download
              </a>{" "}
              to try again.
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody>
            <p className="text-sm text-muted-foreground">
              SoulFire is free, open-source, and community-driven. If you find
              it useful, consider supporting the project:
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild variant="outline" className="w-full gap-2">
                <a
                  href="https://ko-fi.com/alexprogrammerde"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Coffee className="h-4 w-4" />
                  Buy me a coffee on Ko-fi
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full gap-2">
                <a
                  href={import.meta.env.VITE_GITHUB_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SiGithub className="h-4 w-4" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </CredenzaBody>
          <CredenzaFooter>
            <CredenzaClose asChild>
              <Button variant="secondary">Close</Button>
            </CredenzaClose>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </Card>
  );
}

function DownloadTip(props: { selection: DownloadSelection }) {
  const selectedOs =
    OS_OPTIONS.find((option) => option.id === props.selection.os) ?? DEFAULT_OS;
  const selectedCpu =
    CPU_OPTIONS.find((option) => option.id === props.selection.cpu) ??
    DEFAULT_CPU;

  return (
    <div className="rounded-xl border bg-muted/30 p-4 text-sm">
      <p className="font-semibold text-primary">Tip</p>
      <p className="text-muted-foreground">
        x86_64 means Intel and AMD CPUs. AArch64 refers to ARM processors like
        Apple Silicon or Snapdragon laptops.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Currently set to{" "}
        <span className="font-medium text-foreground">{selectedOs.label}</span>{" "}
        • {selectedCpu.label}
      </p>
    </div>
  );
}

function DownloadSelectionSkeleton() {
  return (
    <>
      <Card className="max-w-(--fd-layout-width) mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Choose your build</CardTitle>
          <CardDescription>
            SoulFire is multi-platform. Tell us what you are running and we will
            point you to the best download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Operating system
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-11 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              CPU architecture
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-muted/30 p-4 text-sm">
        <p className="font-semibold text-primary">Tip</p>
        <p className="text-muted-foreground">
          x86_64 means Intel and AMD CPUs. AArch64 refers to ARM processors like
          Apple Silicon or Snapdragon laptops.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Currently set to{" "}
          <Skeleton className="inline-block h-3 w-16 align-middle" /> •{" "}
          <Skeleton className="inline-block h-3 w-24 align-middle" />
        </p>
      </div>
    </>
  );
}

const SERVER_ICONS = {
  "SoulFire CLI": <Terminal className="h-5 w-5" />,
  "SoulFire Dedicated": <Server className="h-5 w-5" />,
} as const;

type DownloadPageContentProps = {
  clientDownloads: DownloadLinkMap;
  releaseDate: string | null;
  releaseName: string;
  serverDownloads: ReturnType<typeof createServerDownloads>;
};

function DownloadPageContent({
  clientDownloads,
  releaseDate,
  releaseName,
  serverDownloads,
}: DownloadPageContentProps) {
  return (
    <main className="mx-auto w-full max-w-(--fd-layout-width) space-y-10 px-4 py-12">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Download SoulFire
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Pick your operating system and CPU architecture. We&apos;ll give
              you the right download plus links to help you learn how everything
              works.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Latest release:{" "}
            <span className="font-medium text-foreground">{releaseName}</span>
            {releaseDate ? (
              <>
                {" "}
                · Updated{" "}
                <Suspense
                  fallback={
                    <Skeleton className="inline-block h-4 w-20 align-middle" />
                  }
                >
                  <CustomTimeAgo date={releaseDate} />
                </Suspense>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <Suspense fallback={<DownloadSelectionSkeleton />}>
        <DownloadSelectionComponent clientDownloads={clientDownloads} />
      </Suspense>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-primary" />
              Learn the workflow
            </CardTitle>
            <CardDescription>
              Understand how SoulFire operates before launching your first test.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Follow the start-here docs for a full walkthrough, including
              account setup, plugins, and tuning tips for realistic bot testing.
            </p>
            <Button asChild variant="outline">
              <Link to="/docs/$" params={{ _splat: "start-here" }}>
                Open the docs
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PlayCircle className="h-5 w-5 text-primary" />
              Watch it in action
            </CardTitle>
            <CardDescription>
              Prefer to learn visually? Use the live GUI demo in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Explore every screen, test presets, and share the experience with
              your team by opening the fully interactive SoulFire demo.
            </p>
            <Button asChild>
              <a
                href="https://demo.soulfiremc.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit the demo
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Server & CLI builds</CardTitle>
            <CardDescription>
              Download the dedicated controller or command line client for
              advanced automations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverDownloads.map((item) => (
              <div
                key={item.name}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {SERVER_ICONS[item.name as keyof typeof SERVER_ICONS] ?? (
                      <Server className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="mt-2 w-full sm:mt-0 sm:w-auto"
                >
                  <a href={item.url} download>
                    Download
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Heart className="h-5 w-5 text-primary" />
              Support the project
            </CardTitle>
            <CardDescription>
              SoulFire is free and open source. Donations help keep it that way.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If SoulFire saves you time or you just want to say thanks,
              consider buying the developer a coffee. Every contribution helps
              fund hosting, development, and new features.
            </p>
            <Button asChild>
              <a
                href="https://ko-fi.com/alexprogrammerde"
                target="_blank"
                rel="noopener noreferrer"
              >
                Donate on Ko-fi
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

const downloadPageLoader = createServerFn({ method: "GET" }).handler(
  async () => {
    const [clientManifest, serverVersionFile] = await Promise.all([
      getClientReleaseManifest().catch(() => null),
      getServerVersion().catch(() => undefined),
    ]);
    const serverVersion =
      serverVersionFile ?? clientManifest?.version?.trim() ?? "latest";
    const clientVersion = clientManifest?.version?.trim() ?? "latest";

    return {
      clientDownloads: createClientDownloads(clientManifest),
      releaseDate: clientManifest?.pub_date?.trim() || null,
      releaseName: `Version ${clientVersion}`,
      serverDownloads: createServerDownloads(serverVersion),
    };
  },
);

export const Route = createFileRoute("/download")({
  validateSearch: validateDownloadSearch,
  head: () => ({
    meta: getPageMeta({
      title: "Download SoulFire - SoulFire",
      description: "Pick your OS and CPU to grab the right SoulFire build.",
      path: "/download",
      imageUrl: "/og/site/download/image.webp",
      imageAlt: "SoulFire download page preview",
    }),
    links: getCanonicalLinks("/download"),
  }),
  loader: async () => downloadPageLoader(),
  component: DownloadPage,
});

function DownloadPage() {
  const data = Route.useLoaderData();

  return (
    <SiteShell>
      <DownloadPageContent
        clientDownloads={data.clientDownloads}
        releaseDate={data.releaseDate}
        releaseName={data.releaseName}
        serverDownloads={data.serverDownloads}
      />
    </SiteShell>
  );
}

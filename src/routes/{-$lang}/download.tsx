import { translate } from "@/lib/messages";
import { TranslatedMessage } from "@/components/translated-message";
import { useT } from "@/lib/i18n-react";
import { isLocale } from "@/lib/i18n";
import { Schema, Effect, Option } from "effect";
import { useHydratedQueryResult } from "@/hooks/use-hydrated-query-result";
import { usePrerenderedSearch } from "@/hooks/use-prerendered-search";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  stripSearchParams,
  useRouterState,
} from "@tanstack/react-router";
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
import { Suspense, useEffect, useRef, useState } from "react";
import { Image } from "@/components/image";
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
import { trackClientDownload } from "@/lib/analytics";
import { detectDownloadPlatform } from "@/lib/download-platform";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  createClientDownloads,
  createServerDownloads,
  type DownloadLinkMap,
} from "@/lib/download-links";
import { getClientReleaseManifest, getServerVersion } from "@/lib/releases";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn, generateN } from "@/lib/utils";

const FALLBACK_CPU = {
  id: "x64",
  label: "x86_64 / AMD64",
  detail: "download.intelOrAmdProcessors",
  icon: "cpu",
} as const;

const ARM_CPU = {
  id: "arm64",
  label: "AArch64 / ARM64",
  detail: "download.appleSiliconOrArmServers",
  icon: "circuit",
} as const;

const WINDOWS_OPTION = {
  id: "windows",
  label: "Windows",
  detail: "download.windows10OrNewer",
  iconSrc: "/platform/windows.png",
  iconAlt: "Windows",
  preferredCpuId: FALLBACK_CPU.id,
} as const;

const OS_OPTIONS = [
  WINDOWS_OPTION,
  {
    id: "macos",
    label: "macOS",
    detail: "download.appleSiliconIntel",
    iconSrc: "/platform/macos.png",
    iconAlt: "macOS",
    preferredCpuId: ARM_CPU.id,
  },
  {
    id: "linux",
    label: "Linux",
    detail: "download.mostDistrosSupported",
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

const downloadSearchSchema = Schema.Struct({
  os: Schema.Literals(OS_IDS)
    .pipe(
      Schema.catchDecoding(() => Effect.succeed(Option.some(DEFAULT_OS.id))),
    )
    .pipe(Schema.withDecodingDefaultType(Effect.succeed(DEFAULT_OS.id))),
  cpu: Schema.Literals(CPU_IDS)
    .pipe(
      Schema.catchDecoding(() => Effect.succeed(Option.some(DEFAULT_CPU.id))),
    )
    .pipe(Schema.withDecodingDefaultType(Effect.succeed(DEFAULT_CPU.id))),
});

type DownloadSelection = (typeof downloadSearchSchema)["Type"];

function DownloadSelectionComponent({
  clientDownloads,
}: {
  clientDownloads: DownloadLinkMap;
}) {
  const selection = usePrerenderedSearch(
    Route.useSearch(),
    Schema.decodeUnknownSync(downloadSearchSchema)({}),
  );
  return (
    <>
      <DownloadConfigurator links={clientDownloads} />
      <DownloadTip selection={selection} />
    </>
  );
}

function DownloadConfigurator({ links }: { links: DownloadLinkMap }) {
  const t = useT();
  const selection = usePrerenderedSearch(
    Route.useSearch(),
    Schema.decodeUnknownSync(downloadSearchSchema)({}),
  );
  const navigate = Route.useNavigate();
  const hasExplicitParams = useRouterState({
    select: ({ location }) =>
      location.search.os !== undefined || location.search.cpu !== undefined,
  });
  const hasDetectedPlatform = useRef(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (hasDetectedPlatform.current) return;
    hasDetectedPlatform.current = true;
    const { os, cpu, mobile } = detectDownloadPlatform(window.navigator);
    setIsMobile(mobile);
    if (hasExplicitParams || mobile) return;
    if (!os && !cpu) return;

    void navigate({
      search: (previous) => ({
        ...previous,
        os: os ?? previous.os,
        cpu: cpu ?? (os ? PREFERRED_CPU_BY_OS[os] : previous.cpu),
      }),
      replace: true,
      resetScroll: false,
    });
  }, [hasExplicitParams, navigate]);

  const downloadHref = links[selection.os]?.[selection.cpu];
  const isDirectGithubDownload = downloadHref?.includes("github.com") ?? false;

  const handleOsChange = (os: DownloadSelection["os"]) => {
    void navigate({
      search: (previous) => ({ ...previous, os, cpu: PREFERRED_CPU_BY_OS[os] }),
      replace: true,
      resetScroll: false,
    });
  };

  const handleCpuChange = (cpu: DownloadSelection["cpu"]) => {
    void navigate({
      search: (previous) => ({ ...previous, cpu }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {t("download.chooseYourBuild")}
        </CardTitle>
        <CardDescription>
          {t("download.soulfireIsMultiPlatformTellUsWhatYouAre")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {isMobile && (
          <Alert>
            <AlertTitle>{t("download.downloadOnAComputer")}</AlertTitle>
            <AlertDescription>
              {t("download.mobile.description")}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("download.operatingSystem")}
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
                    <Image
                      src={option.iconSrc}
                      alt={option.iconAlt}
                      width={28}
                      height={28}
                      className="size-7"
                    />
                  </div>
                  <div>
                    <div className="text-base font-semibold">
                      {option.label}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(option.detail)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("download.cpuArchitecture")}
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
                      {t(option.detail)}
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
              trackClientDownload({
                os: selection.os,
                architecture: selection.cpu,
                href: downloadHref,
              });
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
            {t("download.downloadFor", {
              os:
                OS_OPTIONS.find((option) => option.id === selection.os)
                  ?.label ?? selection.os,
            })}
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full gap-2 text-xs sm:text-sm"
            disabled
          >
            <Download className="h-5 w-5" />
            {t("download.comingSoon")}
          </Button>
        )}
      </CardContent>
      <Credenza open={showThankYou} onOpenChange={setShowThankYou}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              {t("download.thankYouForDownloading")}
            </CredenzaTitle>
            <CredenzaDescription>
              <TranslatedMessage
                text="download.yourDownloadShouldStartShortlyIfItDoesnT"
                values={{
                  retry: (
                    <a
                      href={downloadHref ?? "#"}
                      onClick={() => {
                        if (downloadHref)
                          trackClientDownload({
                            os: selection.os,
                            architecture: selection.cpu,
                            href: downloadHref,
                            retry: true,
                          });
                      }}
                      className="underline text-primary"
                      {...(isDirectGithubDownload
                        ? { download: "" }
                        : { target: "_blank", rel: "noopener noreferrer" })}
                    >
                      {t("download.retryTheDownload")}
                    </a>
                  ),
                }}
              />
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody>
            <p className="text-sm text-muted-foreground">
              {t("download.soulfireIsFreeOpenSourceAndCommunityDrivenIf")}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Button
                render={
                  <a
                    href="https://ko-fi.com/alexprogrammerde"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Coffee className="h-4 w-4" />
                    {t("download.buyMeACoffeeOnKoFi")}
                  </a>
                }
                nativeButton={false}
                variant="outline"
                className="w-full gap-2"
              />
              <Button
                render={
                  <a
                    href={import.meta.env.VITE_GITHUB_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SiGithub className="h-4 w-4" />
                    {t("download.starOnGithub")}
                  </a>
                }
                nativeButton={false}
                variant="outline"
                className="w-full gap-2"
              />
            </div>
          </CredenzaBody>
          <CredenzaFooter>
            <CredenzaClose
              render={<Button variant="secondary">{t("common.close")}</Button>}
            />
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </Card>
  );
}

function DownloadTip(props: { selection: DownloadSelection }) {
  const t = useT();
  const selectedOs =
    OS_OPTIONS.find((option) => option.id === props.selection.os) ?? DEFAULT_OS;
  const selectedCpu =
    CPU_OPTIONS.find((option) => option.id === props.selection.cpu) ??
    DEFAULT_CPU;

  return (
    <div className="rounded-xl border bg-muted/30 p-4 text-sm">
      <p className="font-semibold text-primary">{t("download.tip")}</p>
      <p className="text-muted-foreground">
        {t("download.x8664MeansIntelAndAmdCpusAarch64Refers")}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        <TranslatedMessage
          text="download.selection.summary"
          values={{
            os: (
              <span className="font-medium text-foreground">
                {selectedOs.label}
              </span>
            ),
            cpu: selectedCpu.label,
          }}
        />
      </p>
    </div>
  );
}

function DownloadSelectionSkeleton() {
  const t = useT();
  return (
    <>
      <Card className="max-w-(--fd-layout-width) mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">
            {t("download.chooseYourBuild")}
          </CardTitle>
          <CardDescription>
            {t("download.soulfireIsMultiPlatformTellUsWhatYouAre")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("download.operatingSystem")}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {generateN(3).map((skeletonId) => (
                <div
                  key={skeletonId}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-11 rounded-lg" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("download.cpuArchitecture")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {generateN(2).map((skeletonId) => (
                <div
                  key={skeletonId}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex flex-col gap-2">
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
        <p className="font-semibold text-primary">{t("download.tip")}</p>
        <p className="text-muted-foreground">
          {t("download.x8664MeansIntelAndAmdCpusAarch64Refers")}
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          {t("download.currentlySetTo")}{" "}
          <Skeleton className="inline-block h-3 w-16 align-middle" /> •{" "}
          <Skeleton className="inline-block h-3 w-24 align-middle" />
        </div>
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
  releasePending: boolean;
  serverDownloads: ReturnType<typeof createServerDownloads>;
};

function DownloadPageContent({
  clientDownloads,
  releaseDate,
  releaseName,
  releasePending,
  serverDownloads,
}: DownloadPageContentProps) {
  const t = useT();
  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-10 px-4 py-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("download.title")}
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              {t("download.pickYourOperatingSystemAndCpuArchitectureWeLl")}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {t("download.latestRelease")}{" "}
            {releasePending ? (
              <Skeleton className="inline-block h-4 w-24 align-middle" />
            ) : (
              <span className="font-medium text-foreground">
                {releaseName === "latest"
                  ? t("download.latestVersion")
                  : t("download.version", { version: releaseName })}
              </span>
            )}
            {releaseDate ? (
              <>
                {" "}
                {t("download.updated")}{" "}
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
              {t("download.learnTheWorkflow")}
            </CardTitle>
            <CardDescription>{t("download.learn.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              {t("download.followTheStartHereDocsForAFullWalkthrough")}
            </p>
            <Button
              render={
                <Link to="/{-$lang}/docs/$" params={{ _splat: "start-here" }}>
                  {t("download.openTheDocs")}
                </Link>
              }
              nativeButton={false}
              variant="outline"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PlayCircle className="h-5 w-5 text-primary" />
              {t("download.watchItInAction")}
            </CardTitle>
            <CardDescription>
              {t("download.preferToLearnVisuallyUseTheLiveGuiDemo")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              {t("download.demo.description")}
            </p>
            <Button
              render={
                <a
                  href="https://demo.soulfiremc.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("download.visitTheDemo")}
                </a>
              }
              nativeButton={false}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {t("download.serverCliBuilds")}
            </CardTitle>
            <CardDescription>
              {t("download.server.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
                      {t(item.description)}
                    </p>
                  </div>
                </div>
                <Button
                  render={
                    <a href={item.url} download>
                      {t("download.download")}
                    </a>
                  }
                  nativeButton={false}
                  size="sm"
                  className="mt-2 w-full sm:mt-0 sm:w-auto"
                />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Heart className="h-5 w-5 text-primary" />
              {t("download.supportTheProject")}
            </CardTitle>
            <CardDescription>
              {t("download.soulfireIsFreeAndOpenSourceDonationsHelpKeep")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              {t("download.ifSoulfireSavesYouTimeOrYouJustWant")}
            </p>
            <Button
              render={
                <a
                  href="https://ko-fi.com/alexprogrammerde"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("download.donateOnKoFi")}
                </a>
              }
              nativeButton={false}
            />
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
      releaseName: clientVersion,
      serverDownloads: createServerDownloads(serverVersion),
    };
  },
);

const downloadPageQueryOptions = queryOptions({
  queryKey: ["download", "latest-release"],
  queryFn: () => downloadPageLoader(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});

const fallbackDownloadData = {
  clientDownloads: createClientDownloads(null),
  releaseDate: null,
  releaseName: "latest",
  serverDownloads: createServerDownloads("latest"),
};

export const Route = createFileRoute("/{-$lang}/download")({
  validateSearch: Schema.toStandardSchemaV1(downloadSearchSchema),
  search: {
    middlewares: [
      stripSearchParams({ os: DEFAULT_OS.id, cpu: DEFAULT_CPU.id }),
    ],
  },
  head: ({ params }) => ({
    meta: getPageMeta({
      locale: isLocale(params.lang) ? params.lang : "en",
      title: translate(
        isLocale(params.lang) ? params.lang : "en",
        "download.downloadSoulfireSoulfire",
      ),
      description: translate(
        isLocale(params.lang) ? params.lang : "en",
        "download.meta.description",
      ),
      path: "/download",
      imageUrl: "/og/site/download/image.webp",
      imageAlt: translate(
        isLocale(params.lang) ? params.lang : "en",
        "download.soulfireDownloadPagePreview",
      ),
    }),
    links: getCanonicalLinks(
      "/download",
      isLocale(params.lang) ? params.lang : "en",
    ),
  }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(downloadPageQueryOptions);
  },
  component: DownloadPage,
});

function DownloadPage() {
  const downloadQuery = useHydratedQueryResult(
    useQuery(downloadPageQueryOptions),
  );
  const data = downloadQuery.data ?? fallbackDownloadData;

  return (
    <SiteShell>
      <DownloadPageContent
        clientDownloads={data.clientDownloads}
        releaseDate={data.releaseDate}
        releaseName={data.releaseName}
        releasePending={downloadQuery.isPending}
        serverDownloads={data.serverDownloads}
      />
    </SiteShell>
  );
}

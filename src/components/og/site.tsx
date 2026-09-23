import type { ReactNode } from "react";
import { labelize } from "@/lib/og";

const theme = {
  background: "#101010",
  surface: "#161616",
  rail: "#121212",
  ink: "#f5f5f2",
  inkSoft: "#dfdfda",
  muted: "#9b938a",
  border: "#2a2a2a",
  borderStrong: "#393939",
  orange: "#d17a33",
  cyan: "#4b8d96",
  green: "#5d8d76",
  rose: "#b26a76",
  violet: "#7f70ad",
};

function fitTitleSize(
  value: string,
  {
    base,
    medium,
    long,
    xlong,
  }: {
    base: number;
    medium: number;
    long: number;
    xlong: number;
  },
) {
  if (value.length > 34) return xlong;
  if (value.length > 24) return long;
  if (value.length > 14) return medium;
  return base;
}

function Header({
  section,
  path,
  accent,
}: {
  section: string;
  path: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: "24px 32px",
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 14,
            height: 14,
            background: accent,
          }}
        />
        <div
          style={{
            color: theme.ink,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          SoulFire
        </div>
        <div
          style={{
            width: 1,
            height: 22,
            background: theme.borderStrong,
          }}
        />
        <div
          style={{
            color: theme.muted,
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          {section}
        </div>
      </div>
      <div
        style={{
          color: theme.muted,
          fontSize: 18,
          fontFamily: "Geist Mono",
        }}
      >
        {path}
      </div>
    </div>
  );
}

function TitleBlock({
  title,
  description,
  accent,
  size,
}: {
  title: string;
  description: string;
  accent: string;
  size: number;
}) {
  return (
    <div style={{ display: "flex", gap: 22 }}>
      <div
        style={{
          width: 12,
          flexShrink: 0,
          background: accent,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            color: theme.ink,
            fontSize: size,
            lineHeight: 0.94,
            fontWeight: 800,
            letterSpacing: "-0.06em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            maxWidth: 700,
            color: theme.muted,
            fontSize: 30,
            lineHeight: 1.32,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

function Footer({ items, accent }: { items?: string[]; accent: string }) {
  if (!items || items.length === 0) return null;

  const visibleItems = items.slice(0, 4);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0,
        paddingTop: 22,
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      {visibleItems.map((item, index) => (
        <div
          key={item}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingRight: index === visibleItems.length - 1 ? 0 : 18,
            marginRight: index === visibleItems.length - 1 ? 0 : 18,
            ...(index === visibleItems.length - 1
              ? {}
              : { borderRight: `1px solid ${theme.border}` }),
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: accent,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              color: theme.inkSoft,
              fontSize: 22,
              lineHeight: 1.25,
              fontWeight: 600,
            }}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

function Sidebar({
  top,
  rows,
  entries,
  accent,
}: {
  top?: ReactNode;
  rows?: { label: string; value: string }[];
  entries?: string[];
  accent: string;
}) {
  const visibleEntries =
    entries
      ?.slice(0, 3)
      .reduce<Array<{ key: string; value: string }>>((acc, value) => {
        const occurrence = acc.filter((entry) => entry.value === value).length;

        acc.push({
          value,
          key: `${value}-${occurrence + 1}`,
        });
        return acc;
      }, []) ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
      }}
    >
      {top ? (
        <div
          style={{
            paddingBottom: 24,
            ...((rows && rows.length > 0) || visibleEntries.length > 0
              ? { borderBottom: `1px solid ${theme.border}` }
              : {}),
          }}
        >
          {top}
        </div>
      ) : null}

      {rows && rows.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {rows.map((row, index) => (
            <div
              key={`${row.label}-${row.value}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                width: "100%",
                paddingTop: 18,
                paddingBottom:
                  index === rows.length - 1 && visibleEntries.length === 0
                    ? 0
                    : 18,
                ...(index === rows.length - 1 && visibleEntries.length === 0
                  ? {}
                  : { borderBottom: `1px solid ${theme.border}` }),
              }}
            >
              <div
                style={{
                  color: accent,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  color: theme.inkSoft,
                  fontSize: 18,
                  lineHeight: 1.25,
                  fontWeight: 600,
                  wordBreak: "break-word",
                }}
              >
                {row.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {visibleEntries.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            paddingTop: 18,
          }}
        >
          {visibleEntries.map((entry, index) => (
            <div
              key={entry.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <div
                style={{
                  minWidth: 30,
                  color: accent,
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: "Geist Mono",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  color: theme.inkSoft,
                  fontSize: 18,
                  lineHeight: 1.3,
                  fontWeight: 600,
                }}
              >
                {entry.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TextHero({
  title,
  description,
  accent,
}: {
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingLeft: 18,
        borderLeft: `6px solid ${accent}`,
      }}
    >
      <div
        style={{
          color: theme.ink,
          fontSize: 50,
          lineHeight: 0.94,
          fontWeight: 800,
          letterSpacing: "-0.05em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: theme.muted,
          fontSize: 20,
          lineHeight: 1.4,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function CountHero({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          color: accent,
          fontSize: 92,
          lineHeight: 0.9,
          fontWeight: 800,
          letterSpacing: "-0.07em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: theme.muted,
          fontSize: 18,
          lineHeight: 1.3,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function LogoHero({
  value,
  accent,
  logoSrc,
}: {
  value: string;
  accent: string;
  logoSrc?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div
        style={{
          width: 64,
          height: 6,
          background: accent,
        }}
      />
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={`${value} logo`}
          style={{
            width: 130,
            height: 130,
            objectFit: "contain",
          }}
        />
      ) : (
        <div
          style={{
            color: theme.ink,
            fontSize: 82,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "-0.05em",
          }}
        >
          {value.charAt(0).toUpperCase()}
        </div>
      )}
      <div
        style={{
          color: theme.muted,
          fontSize: 16,
          fontFamily: "Geist Mono",
        }}
      >
        {value.slice(0, 14)}
      </div>
    </div>
  );
}

function Layout({
  section,
  path,
  accent,
  title,
  description,
  titleSize,
  footer,
  sidebar,
}: {
  section: string;
  path: string;
  accent: string;
  title: string;
  description: string;
  titleSize: number;
  footer?: string[];
  sidebar: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 28,
        background: theme.background,
        color: theme.ink,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: theme.surface,
          border: `1px solid ${theme.borderStrong}`,
        }}
      >
        <Header section={section} path={path} accent={accent} />
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              minWidth: 0,
              padding: "36px 38px 30px 38px",
              gap: 28,
            }}
          >
            <TitleBlock
              title={title}
              description={description}
              accent={accent}
              size={titleSize}
            />
            <Footer items={footer} accent={accent} />
          </div>
          <div
            style={{
              width: 344,
              minWidth: 344,
              padding: "30px 28px",
              background: theme.rail,
              borderLeft: `1px solid ${theme.border}`,
            }}
          >
            {sidebar}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeOgImage() {
  return (
    <Layout
      section="Core Platform"
      path="site/home"
      accent={theme.green}
      title="Advanced Minecraft Stress Testing"
      description="Real client code across versions with GUI, CLI, and dedicated server workflows."
      titleSize={92}
      footer={["All versions", "GUI and CLI", "Plugins"]}
      sidebar={
        <Sidebar
          accent={theme.green}
          top={
            <TextHero
              accent={theme.green}
              title="Real clients"
              description="Protocol behavior that matches production sessions."
            />
          }
          rows={[
            { label: "Interfaces", value: "GUI, CLI, Dedicated" },
            { label: "Coverage", value: "All Minecraft versions" },
          ]}
        />
      }
    />
  );
}

export function DownloadOgImage({ version }: { version?: string }) {
  return (
    <Layout
      section="Distribution"
      path="site/download"
      accent={theme.orange}
      title="Download SoulFire"
      description="Native installers for every platform, with desktop and server workflows ready out of the box."
      titleSize={96}
      footer={["Windows", "macOS", "Linux"]}
      sidebar={
        <Sidebar
          accent={theme.orange}
          top={
            <TextHero
              accent={theme.orange}
              title="No Java"
              description="Native builds for desktop installs and server deployment."
            />
          }
          rows={[
            { label: "Desktop", value: "Windows, macOS, Linux" },
            { label: "Server", value: "CLI and Dedicated" },
            { label: "Version", value: version ? `v${version}` : "Latest" },
          ]}
        />
      }
    />
  );
}

export function DirectoryOgImage({
  label,
  title,
  description,
  accent,
  secondary: _secondary,
  count,
  samples,
}: {
  label: string;
  title: string;
  description: string;
  accent: string;
  secondary: string;
  count?: number;
  samples: string[];
}) {
  return (
    <Layout
      section={`${label} Directory`}
      path={`site/${label.toLowerCase().replace(/\s+/g, "-")}`}
      accent={accent}
      title={title}
      description={description}
      titleSize={fitTitleSize(title, {
        base: 84,
        medium: 76,
        long: 68,
        xlong: 60,
      })}
      sidebar={
        <Sidebar
          accent={accent}
          top={
            count !== undefined ? (
              <CountHero
                accent={accent}
                value={`${count}`}
                label="entries in this directory"
              />
            ) : undefined
          }
          entries={samples}
        />
      }
    />
  );
}

export function ProxyOgImage({
  name,
  summary,
  badges,
  logoSrc,
}: {
  name: string;
  summary: string;
  badges: string[];
  logoSrc?: string;
}) {
  const normalizedBadges = badges.map((badge) => labelize(badge));

  return (
    <Layout
      section="Proxy Profile"
      path="proxies/profile"
      accent={theme.cyan}
      title={name}
      description={summary}
      titleSize={fitTitleSize(name, {
        base: 88,
        medium: 80,
        long: 72,
        xlong: 64,
      })}
      sidebar={
        <Sidebar
          accent={theme.cyan}
          top={<LogoHero value={name} accent={theme.cyan} logoSrc={logoSrc} />}
          rows={[
            {
              label: "Status",
              value: "Listed provider",
            },
            {
              label: "Network",
              value:
                normalizedBadges.length > 0
                  ? normalizedBadges[0]
                  : "Proxy network",
            },
          ]}
        />
      }
    />
  );
}

export function AccountOgImage({
  name,
  listings,
  description,
  logoSrc,
}: {
  name: string;
  listings: { label: string; price: string }[];
  description: string;
  logoSrc?: string;
}) {
  return (
    <Layout
      section="Account Provider"
      path="accounts/provider"
      accent={theme.rose}
      title={name}
      description={description}
      titleSize={fitTitleSize(name, {
        base: 88,
        medium: 80,
        long: 72,
        xlong: 64,
      })}
      sidebar={
        <Sidebar
          accent={theme.rose}
          top={<LogoHero value={name} accent={theme.rose} logoSrc={logoSrc} />}
          rows={listings.map((listing) => ({
            label: listing.label,
            value: listing.price,
          }))}
        />
      }
    />
  );
}

export function ResourceOgImage({
  name,
  description,
  author,
  category,
  badges,
  version,
  logoSrc,
}: {
  name: string;
  description: string;
  author: string;
  category: string;
  badges: string[];
  version?: string;
  logoSrc?: string;
}) {
  const normalizedBadges = badges.map((badge) => labelize(badge));

  return (
    <Layout
      section="Community Resource"
      path="resources/item"
      accent={theme.violet}
      title={name}
      description={description}
      titleSize={fitTitleSize(name, {
        base: 82,
        medium: 74,
        long: 66,
        xlong: 58,
      })}
      sidebar={
        <Sidebar
          accent={theme.violet}
          top={
            <LogoHero value={name} accent={theme.violet} logoSrc={logoSrc} />
          }
          entries={normalizedBadges}
          rows={[
            { label: "Category", value: labelize(category) },
            { label: "Author", value: author },
            ...(version ? [{ label: "Version", value: `v${version}` }] : []),
          ]}
        />
      }
    />
  );
}

import { labelize } from "@/lib/og";

const palette = {
  bg: "#040c18",
  bgAlt: "#0a1628",
  panel: "rgba(8, 20, 36, 0.85)",
  panelStrong: "rgba(10, 24, 44, 0.94)",
  border: "rgba(120, 170, 220, 0.18)",
  text: "#f0f6ff",
  muted: "#8daec8",
  cyan: "#4cc9ff",
  blue: "#4a7dff",
  green: "#5ef0a8",
  amber: "#ffb04a",
  rose: "#ff6b8a",
  violet: "#a98aff",
};

export function BlogOgImage({
  title,
  description,
  author,
  date,
  tags,
  readTime,
  logoSrc,
}: {
  title: string;
  description?: string | null;
  author?: string | null;
  date?: string | null;
  tags?: string[];
  readTime?: string;
  logoSrc?: string;
}) {
  const category = tags?.[0] ? labelize(tags[0]) : "Blog";
  const byline = author || "SoulFire Team";
  const metadata = [date, readTime].filter(Boolean).join("  •  ");
  const titleSize = fitTitleSize(title, {
    base: 86,
    medium: 78,
    long: 70,
    xlong: 62,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#111111",
        color: "white",
        backgroundImage:
          "linear-gradient(135deg, #1a1a1a 0%, #000000 100%), radial-gradient(circle at top right, rgba(255,176,74,0.18), transparent 32%)",
        padding: "60px",
        justifyContent: "space-between",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div
          style={{
            display: "flex",
            backgroundColor: palette.amber,
            color: "#111111",
            padding: "8px 24px",
            borderRadius: "9999px",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          {category}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.08,
            margin: 0,
            letterSpacing: "-0.05em",
            textShadow: "0 4px 12px rgba(0,0,0,0.35)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            fontWeight: 400,
            lineHeight: 1.35,
            maxWidth: "92%",
            letterSpacing: "-0.01em",
            lineClamp: 2,
            textOverflow: "ellipsis",
            overflow: "hidden",
          }}
        >
          {description ||
            "Fresh notes on Minecraft bot testing, operations, and SoulFire development."}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="SoulFire logo"
            style={{
              width: 84,
              height: 84,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              color: palette.amber,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              width: 64,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            SF
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 32, fontWeight: 600 }}>{byline}</div>
          {metadata ? (
            <div style={{ fontSize: 24, color: "#a1a1aa" }}>{metadata}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DocsOgImage({
  title,
  description,
  slugs,
  logoSrc,
}: {
  title: string;
  description?: string | null;
  slugs?: string[];
  logoSrc?: string;
}) {
  const section = slugs?.[0] ? labelize(slugs[0]) : "Documentation";
  const siteLabel = "soulfiremc.com/docs";
  const titleSize = fitTitleSize(title, {
    base: 74,
    medium: 68,
    long: 62,
    xlong: 56,
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#050505",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "white",
        backgroundImage:
          "linear-gradient(to bottom right, rgba(76,201,255,0.22), transparent 38%), linear-gradient(135deg, #09111a 0%, #050505 100%)",
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "90px 60px 90px 60px",
          position: "relative",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            marginBottom: "40px",
            textWrap: "pretty",
          }}
        >
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "white",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 44,
              color: "#a1a1aa",
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: "95%",
              letterSpacing: "-0.01em",
              lineClamp: 2,
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {description ||
              "Guides and reference material for using, extending, and operating SoulFire."}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8bdcff",
              fontSize: 18,
              fontWeight: 800,
              width: 42,
              height: 42,
              flexShrink: 0,
            }}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="SoulFire logo"
                style={{
                  width: 34,
                  height: 34,
                  objectFit: "contain",
                }}
              />
            ) : (
              "SF"
            )}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "white",
              opacity: 0.9,
            }}
          >
            {siteLabel}
          </div>
          <div style={{ display: "flex", flexGrow: 1 }} />
          <div
            style={{
              display: "flex",
              height: 4,
              width: 60,
              backgroundColor: palette.cyan,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#8bdcff",
              opacity: 0.8,
            }}
          >
            {section}
          </div>
        </div>
      </div>
    </div>
  );
}

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

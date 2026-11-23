import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";
import { localizePath, type Locale } from "./i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Image } from "@/components/image";
import { getRequiredEnv } from "@/lib/env";

export function getBaseLayoutOptions(locale: Locale = "en"): BaseLayoutProps {
  return {
    // oxlint-disable-next-line typescript/no-deprecated -- moving the language switch to layout slots is a separate change
    i18n: true,
    nav: {
      url: localizePath("/", locale),
      title: (
        <>
          <Image
            priority
            src="/logo.png"
            width={32}
            height={32}
            alt="SoulFire Logo"
          />
          <span className="font-medium">SoulFire</span>
        </>
      ),
      transparentMode: "top",
    },
    links: [
      {
        type: "icon",
        icon: <SiDiscord />,
        text: "Discord",
        label: "Discord",
        url: getRequiredEnv(
          import.meta.env.VITE_DISCORD_LINK,
          "VITE_DISCORD_LINK",
        ),
        external: true,
      },
      {
        type: "icon",
        icon: <SiGithub />,
        text: "GitHub",
        label: "GitHub",
        url: "https://github.com/soulfiremc-com/SoulFire",
        external: true,
      },
    ],
  };
}

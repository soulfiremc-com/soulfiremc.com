import { SiDiscord, SiGithub } from "@icons-pack/react-simple-icons";
import { localizePath, type Locale } from "./i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Image } from "@/components/image";
import {
  LanguageSelect,
  LanguageSelectText,
} from "@/components/language-select";
import { getRequiredEnv } from "@/lib/env";

export const discordUrl = getRequiredEnv(
  import.meta.env.VITE_DISCORD_LINK,
  "VITE_DISCORD_LINK",
);
export const githubUrl = "https://github.com/soulfiremc-com/SoulFire";

export function getBaseLayoutOptions(locale: Locale = "en"): BaseLayoutProps {
  return {
    slots: {
      languageSelect: { root: LanguageSelect, text: LanguageSelectText },
    },
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
        url: discordUrl,
        external: true,
      },
      {
        type: "icon",
        icon: <SiGithub />,
        text: "GitHub",
        label: "GitHub",
        url: githubUrl,
        external: true,
      },
    ],
  };
}

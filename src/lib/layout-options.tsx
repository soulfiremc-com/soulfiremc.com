import { SiDiscord, SiGithub, SiKofi } from "@icons-pack/react-simple-icons";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Image } from "@/components/image";
import { getRequiredEnv } from "@/lib/env";

export function getBaseLayoutOptions(): BaseLayoutProps {
  return {
    nav: {
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
      {
        type: "icon",
        icon: <SiKofi />,
        text: "Ko-fi",
        label: "Ko-fi",
        url: "https://ko-fi.com/alexprogrammerde/tiers",
        external: true,
      },
    ],
  };
}

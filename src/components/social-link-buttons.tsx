import {
  SiDiscord,
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiTelegram,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { Mail } from "lucide-react";
import type { SVGProps } from "react";
import { Button } from "@/components/ui/button";

export type SocialPlatform =
  | "whatsapp"
  | "teams"
  | "email"
  | "facebook"
  | "discord"
  | "linkedin"
  | "youtube"
  | "x"
  | "tiktok"
  | "telegram"
  | "instagram"
  | "github";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
};

// Simple Icons removed LinkedIn and Microsoft due to brand takedown
// requests, so we inline the official SVG paths here.
function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>LinkedIn</title>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function MicrosoftTeamsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Microsoft Teams</title>
      <path d="M20.625 8.127h-4.432V4.73a2.73 2.73 0 0 1 5.46 0v1.956a1.44 1.44 0 0 1-1.028 1.441zm.938 1.345H14.25a.938.938 0 0 0-.938.938v7.5a3.75 3.75 0 0 0 3.75 3.75 4.687 4.687 0 0 0 4.688-4.688v-6.562a.938.938 0 0 0-.938-.938zm-7.5-4.5a3.284 3.284 0 1 1 0 .007zM12 9.472H2.438A.938.938 0 0 0 1.5 10.41v7.5A5.625 5.625 0 0 0 7.125 23.53h.75A5.625 5.625 0 0 0 12.938 17.91V10.41a.938.938 0 0 0-.938-.938zm-4.5-1.125a4.219 4.219 0 1 1 4.219-4.219A4.22 4.22 0 0 1 7.5 8.347z" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<
  SocialPlatform,
  React.ComponentType<SVGProps<SVGSVGElement>>
> = {
  whatsapp: SiWhatsapp,
  teams: MicrosoftTeamsIcon,
  email: Mail,
  facebook: SiFacebook,
  discord: SiDiscord,
  linkedin: LinkedInIcon,
  youtube: SiYoutube,
  x: SiX,
  tiktok: SiTiktok,
  telegram: SiTelegram,
  instagram: SiInstagram,
  github: SiGithub,
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  whatsapp: "WhatsApp",
  teams: "Microsoft Teams",
  email: "Email",
  facebook: "Facebook",
  discord: "Discord",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  tiktok: "TikTok",
  telegram: "Telegram",
  instagram: "Instagram",
  github: "GitHub",
};

export function SocialLinkButtons({
  links,
  className,
}: {
  links?: SocialLink[];
  className?: string;
}) {
  if (!links?.length) {
    return null;
  }

  return (
    <>
      {links.map((link) => {
        const Icon = PLATFORM_ICONS[link.platform];
        const label = PLATFORM_LABELS[link.platform];
        return (
          <Button
            key={`${link.platform}-${link.url}`}
            asChild
            variant="secondary"
            size="icon-sm"
            className={className}
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener nofollow"
              aria-label={label}
              title={label}
            >
              <Icon />
            </a>
          </Button>
        );
      })}
    </>
  );
}

import {
  Building2,
  Gift,
  Globe,
  Heart,
  Home,
  Infinity as InfinityIcon,
  Network,
  Smartphone,
  Star,
  Wifi,
} from "lucide-react";
import type { SocialLink } from "@/components/social-link-buttons";

export type FilterableBadge =
  | "residential"
  | "datacenter"
  | "isp"
  | "mobile"
  | "free-tier"
  | "unlimited-bandwidth"
  | "budget-friendly"
  | "enterprise"
  | "high-quality";

export type Badge = FilterableBadge | "sponsor" | "bedrock-udp";

export type SponsorTheme = {
  ring: string;
  bg: string;
  badge: string;
};

export type Provider = {
  slug: string;
  name: string;
  logo?: string;
  summary: string;
  url: string;
  badges: Badge[];
  sponsor?: boolean;
  sponsorTheme?: string;
  couponCode?: string;
  couponDiscount?: string;
  startDate?: string;
  gallery?: { src: string; alt: string }[];
  paymentMethods?: string[];
  socialLinks?: SocialLink[];
};

export const SPONSOR_THEMES: Record<string, SponsorTheme> = {
  green: {
    ring: "ring-green-500/50",
    bg: "bg-gradient-to-r from-green-500/5 to-emerald-500/5",
    badge: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  pink: {
    ring: "ring-pink-500/50",
    bg: "bg-gradient-to-r from-pink-500/5 to-purple-500/5",
    badge: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  amber: {
    ring: "ring-amber-500/50",
    bg: "bg-gradient-to-r from-amber-500/5 to-orange-500/5",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

export const BADGE_CONFIG: Record<
  Badge,
  {
    label: string;
    className: string;
    description: string;
    icon: React.ReactNode;
  }
> = {
  "free-tier": {
    label: "Free Tier",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
    description:
      "This provider offers a free tier, allowing you to test their service before committing to a paid plan.",
    icon: <Gift className="h-3 w-3" />,
  },
  "high-quality": {
    label: "High Quality",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description:
      "Premium proxies with high reliability, fast speeds, and excellent uptime. Best for demanding use cases.",
    icon: <Star className="h-3 w-3" />,
  },
  residential: {
    label: "Residential",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    description:
      "Real residential IP addresses from ISPs. Harder to detect and block, ideal for realistic testing scenarios.",
    icon: <Home className="h-3 w-3" />,
  },
  datacenter: {
    label: "Datacenter",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description:
      "Fast and affordable proxies from data centers. Great for high-volume testing where speed matters most.",
    icon: <Building2 className="h-3 w-3" />,
  },
  "unlimited-bandwidth": {
    label: "Unlimited Bandwidth",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description:
      "No data caps or bandwidth limits. Perfect for extensive bot testing without worrying about usage.",
    icon: <InfinityIcon className="h-3 w-3" />,
  },
  sponsor: {
    label: "Sponsor",
    className: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    description:
      "This provider sponsors SoulFire monthly, helping fund the development of the project.",
    icon: <Heart className="h-3 w-3 fill-current" />,
  },
  "bedrock-udp": {
    label: "Bedrock / UDP",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    description:
      "This provider offers UDP-capable proxies, which are required for Minecraft Bedrock connections through SOCKS5.",
    icon: <Network className="h-3 w-3" />,
  },
  "budget-friendly": {
    label: "Budget Friendly",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description:
      "Affordable pricing with good value for money. Great for smaller projects or those on a tight budget.",
    icon: <Globe className="h-3 w-3" />,
  },
  enterprise: {
    label: "Enterprise",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    description:
      "Enterprise-grade solution with advanced features, compliance certifications, and dedicated support.",
    icon: <Building2 className="h-3 w-3" />,
  },
  isp: {
    label: "ISP",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    description:
      "Static ISP proxies that combine datacenter speed with residential trust levels.",
    icon: <Wifi className="h-3 w-3" />,
  },
  mobile: {
    label: "Mobile",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    description:
      "Mobile carrier IP addresses. Highest trust level, ideal for mobile app testing.",
    icon: <Smartphone className="h-3 w-3" />,
  },
};

export function getProviderBySlug(slug: string): Provider | undefined {
  return PROVIDERS.find((provider) => provider.slug === slug);
}

export const FILTER_BADGES: FilterableBadge[] = [
  "residential",
  "datacenter",
  "isp",
  "mobile",
  "free-tier",
  "unlimited-bandwidth",
  "budget-friendly",
  "enterprise",
  "high-quality",
];

export const PROVIDERS: Provider[] = [
  // Sponsor always first
  {
    slug: "legionproxy",
    name: "LegionProxy",
    logo: "/providers/legionproxy.png",
    summary:
      "74M+ IPs across 195+ countries with residential, static ISP, datacenter, and IPv6 proxies. Proxy from $0.6/GB. GB credits never expire, unlimited daily plans available, and crypto payments are supported.",
    url: "https://legionproxy.io/?utm_source=github&utm_campaign=soulfire",
    badges: [
      "sponsor",
      "bedrock-udp",
      "budget-friendly",
      "unlimited-bandwidth",
      "residential",
      "datacenter",
      "isp",
    ],
    sponsor: true,
    sponsorTheme: "green",
    paymentMethods: ["Card", "Crypto"],
    socialLinks: [
      { platform: "discord", url: "https://discord.gg/legionproxy" },
      { platform: "telegram", url: "https://t.me/legionproxy" },
    ],
  },
  {
    slug: "proxy-seller",
    name: "Proxy-Seller",
    logo: "/providers/proxyseller.png",
    summary:
      "Dedicated datacenter proxies in 40+ countries. Unlimited bandwidth with 72-hour refund policy. From $0.9/IP.",
    url: "https://proxy-seller.com/?utm_source=soulfiremc&utm_medium=referral&utm_campaign=partner_promo&utm_term=soulfiremc&partner=GRJY71PA3XWPPP",
    badges: [
      "sponsor",
      "budget-friendly",
      "datacenter",
      "isp",
      "mobile",
      "residential",
    ],
    sponsor: true,
    sponsorTheme: "amber",
    couponCode: "SOULFIREMC",
    couponDiscount:
      "15% off IPv4/IPv6/ISP - 39% off Residential - 10% off Mobile proxies",
    paymentMethods: ["PayPal", "Visa", "Mastercard", "Crypto"],
    socialLinks: [
      {
        platform: "teams",
        url: "https://teams.live.com/l/invite/FEA7dpU6RtxI1t58QI",
      },
      { platform: "email", url: "mailto:support@proxy-seller.com" },
      { platform: "discord", url: "https://discord.gg/QNew393mVK" },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/company/proxyseller/",
      },
      {
        platform: "youtube",
        url: "https://www.youtube.com/channel/UC93BysELhgDHyOZJuNdluxA",
      },
      {
        platform: "facebook",
        url: "https://www.facebook.com/sellerproxy",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/proxy_seller_com/",
      },
      { platform: "telegram", url: "https://t.me/proxy_seller" },
    ],
  },
  // Higher recommends
  {
    slug: "thordata",
    name: "Thordata",
    logo: "/providers/thordata.png",
    summary:
      "60M+ residential IPs across 190+ countries with 99.9% uptime. Offers residential, mobile, datacenter, and static ISP proxies.",
    url: "https://affiliate.thordata.com/soulfire?utm_source=get-proxies&utm_campaign=soulfire",
    badges: ["bedrock-udp", "high-quality", "residential", "mobile", "isp"],
    couponCode: "THORDATA",
    couponDiscount: "20% off",
    paymentMethods: ["Wallet", "Card", "Crypto", "PayPal", "Alipay"],
    socialLinks: [
      { platform: "whatsapp", url: "https://wa.me/qr/6G5OORTHEZC2I1" },
      {
        platform: "teams",
        url: "https://teams.live.com/l/invite/FEATRmC-rTYA8c1rwM",
      },
      { platform: "email", url: "mailto:support@thordata.com" },
      {
        platform: "facebook",
        url: "https://www.facebook.com/people/Thordata/61573084117410/",
      },
      { platform: "discord", url: "https://discord.gg/pjXxRvVKGE" },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/company/thordata/",
      },
      { platform: "youtube", url: "https://www.youtube.com/@Thordata" },
      { platform: "x", url: "https://x.com/ThordataTeam" },
    ],
  },
  {
    slug: "webshare",
    name: "Webshare",
    logo: "/providers/webshare.svg",
    summary:
      "80M+ rotating residential IPs from 195 countries, plus fast datacenter proxies. Offers 10 free proxies to get started.",
    url: "https://www.webshare.io/?referral_code=36gneippfiwt&utm_source=get-proxies&utm_campaign=soulfire",
    badges: ["free-tier", "residential", "datacenter", "budget-friendly"],
    paymentMethods: ["Card", "Apple Pay", "Google Pay"],
    socialLinks: [
      { platform: "email", url: "mailto:support@webshare.io" },
      { platform: "facebook", url: "https://www.facebook.com/webshareproxy/" },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/company/webshare-software/",
      },
    ],
  },
  {
    slug: "proxyscrape",
    name: "ProxyScrape",
    logo: "/providers/proxyscrape.svg",
    summary:
      "55M+ residential IPs with 99.9% success rate. Unlimited bandwidth plans available for high-volume bot testing.",
    url: "https://proxyscrape.com/?ref=mge4mtc&utm_source=get-proxies&utm_campaign=soulfire",
    badges: ["bedrock-udp", "unlimited-bandwidth", "residential"],
    paymentMethods: ["Card", "PayPal", "Alipay", "Crypto", "Local methods"],
    socialLinks: [
      {
        platform: "facebook",
        url: "https://www.facebook.com/ProxyScrape-2293011407635184/",
      },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/company/proxyscrape/",
      },
      { platform: "x", url: "https://x.com/proxyscrape_" },
      { platform: "telegram", url: "https://t.me/proxyscrape" },
      { platform: "discord", url: "https://discord.gg/scrape" },
    ],
  },
  {
    slug: "plainproxies",
    name: "PlainProxies",
    logo: "/providers/plainproxies.png",
    summary:
      "German provider with 10M+ IPs. 10Gbps datacenter proxies and unlimited residential options with rate-limit free rotation.",
    url: "https://dashboard.plainproxies.com/?ref=wTOIS7dS&utm_source=get-proxies&utm_campaign=soulfire",
    badges: [
      "bedrock-udp",
      "unlimited-bandwidth",
      "residential",
      "datacenter",
      "isp",
    ],
    paymentMethods: ["Card", "PayPal", "Crypto"],
    socialLinks: [
      { platform: "email", url: "mailto:support@plainproxies.com" },
      {
        platform: "linkedin",
        url: "https://linkedin.com/company/plainproxies",
      },
      { platform: "x", url: "https://twitter.com/plainproxies" },
      { platform: "telegram", url: "https://t.me/plainproxies" },
      { platform: "instagram", url: "https://instagram.com/plainproxies" },
    ],
  },
  {
    slug: "flameproxies",
    name: "FlameProxies",
    logo: "/providers/flameproxies.svg",
    summary:
      "81M+ residential IPs across 180+ countries, plus mobile, datacenter, and rotating ISP options. Pay-as-you-go from $0.50/GB with sticky sessions and SOCKS5 support.",
    url: "https://flameproxies.com/register?referral=42M1SH76&utm_source=get-proxies&utm_campaign=soulfire",
    badges: [
      "bedrock-udp",
      "budget-friendly",
      "residential",
      "datacenter",
      "mobile",
      "isp",
    ],
    paymentMethods: ["Checkout varies"],
    socialLinks: [
      { platform: "email", url: "mailto:support@flameproxies.com" },
      { platform: "x", url: "https://x.com/flameproxies_" },
      { platform: "discord", url: "https://discord.com/invite/flameproxy" },
      { platform: "telegram", url: "https://t.me/flameproxies" },
    ],
  },
  {
    slug: "flashproxy",
    name: "FlashProxy",
    logo: "/providers/flashproxy.png",
    summary:
      "100M+ residential IPs across 195+ countries, plus datacenter, ISP, mobile, and IPv6 proxies. Pay-as-you-go from $0.10/GB with HTTP/SOCKS5/UDP support and unlimited bandwidth options.",
    url: "https://flashproxy.com/auth/register?r=3iBXdeFq44ez75bmNsOr6P04l4x1&utm_source=get-proxies&utm_campaign=soulfire",
    badges: [
      "bedrock-udp",
      "budget-friendly",
      "unlimited-bandwidth",
      "residential",
      "datacenter",
      "isp",
      "mobile",
    ],
    paymentMethods: ["Card", "Crypto"],
    socialLinks: [
      { platform: "email", url: "mailto:support@flashproxy.io" },
      { platform: "discord", url: "https://discord.gg/zbyAvBHaEv" },
      { platform: "telegram", url: "https://t.me/flashproxyofficial" },
    ],
  },
  // Enterprise tier
  {
    slug: "bright-data",
    name: "Bright Data",
    logo: "/providers/brightdata.png",
    summary:
      "Market leader with 770K+ datacenter IPs and massive residential network. ISO 27001 & SOC 2 certified with 99.99% uptime.",
    url: "https://get.brightdata.com/soulfire?utm_source=get-proxies&utm_campaign=soulfire",
    badges: [
      "bedrock-udp",
      "enterprise",
      "high-quality",
      "residential",
      "datacenter",
      "mobile",
    ],
    paymentMethods: [
      "Credit card",
      "PayPal",
      "Alipay",
      "Payoneer",
      "Wire transfer",
      "Amazon Marketplace",
    ],
    socialLinks: [
      { platform: "whatsapp", url: "https://wa.me/972543536332" },
      { platform: "email", url: "mailto:sales@brightdata.com" },
      { platform: "telegram", url: "https://t.me/bright_data" },
      {
        platform: "linkedin",
        url: "https://il.linkedin.com/company/bright-data",
      },
      {
        platform: "youtube",
        url: "https://www.youtube.com/channel/UCM_0cG1ljAoEUcZIyoUIq6g",
      },
      { platform: "github", url: "https://github.com/luminati-io" },
    ],
  },
  {
    slug: "oxylabs",
    name: "Oxylabs",
    logo: "/providers/oxylabs.png",
    summary:
      "175M+ residential IPs across 195+ countries. Largest proxy network globally with 99.95% success rate and 0.6s avg response time.",
    url: "https://oxylabs.go2cloud.org/aff_c?offer_id=7&aff_id=1896&url_id=144&utm_source=get-proxies&utm_campaign=soulfire",
    badges: [
      "bedrock-udp",
      "enterprise",
      "high-quality",
      "residential",
      "datacenter",
    ],
    paymentMethods: [
      "Credit card",
      "PayPal",
      "Alipay",
      "Apple Pay",
      "Google Pay",
      "Wire transfer",
    ],
    socialLinks: [
      { platform: "email", url: "mailto:hello@oxylabs.io" },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/company/oxylabs-io/",
      },
      { platform: "instagram", url: "https://www.instagram.com/oxylabs.io/" },
      { platform: "facebook", url: "https://www.facebook.com/oxylabs.io/" },
      {
        platform: "youtube",
        url: "https://www.youtube.com/channel/UCvVIcCb6kpeSVyRkZjGowQw",
      },
    ],
  },
  // Mid tier
  {
    slug: "decodo",
    name: "Decodo (formerly Smartproxy)",
    logo: "/providers/decodo.svg",
    summary:
      "115M+ ethically-sourced residential IPs across 195+ locations. User-friendly with 99.86% success rate. Great for SMBs.",
    url: "https://visit.decodo.com/K0rr7e?utm_source=get-proxies&utm_campaign=soulfire",
    badges: ["bedrock-udp", "high-quality", "residential", "datacenter"],
    paymentMethods: [
      "Card",
      "PayPal",
      "Apple Pay",
      "Google Pay",
      "Alipay",
      "Crypto",
      "Wallet",
    ],
    socialLinks: [
      { platform: "email", url: "mailto:sales@decodo.com" },
      {
        platform: "youtube",
        url: "https://www.youtube.com/channel/UCqHoe4Ixju1bcOy0jHPO8Kg",
      },
      { platform: "github", url: "https://github.com/Decodo" },
      { platform: "linkedin", url: "https://www.linkedin.com/company/decodo/" },
      { platform: "discord", url: "https://discord.gg/WQHGnpgJfC" },
    ],
  },
  {
    slug: "iproyal",
    name: "IPRoyal",
    logo: "/providers/iproyal.svg",
    summary:
      "32M+ residential IPs across 195+ countries. Non-expiring traffic with unlimited bandwidth and threads. Great value.",
    url: "https://iproyal.com/?r=soulfire&utm_source=get-proxies&utm_campaign=soulfire",
    badges: [
      "bedrock-udp",
      "budget-friendly",
      "residential",
      "datacenter",
      "isp",
    ],
    paymentMethods: ["Credit card", "PayPal", "Google Pay", "Alipay", "Crypto"],
    socialLinks: [
      { platform: "email", url: "mailto:support@iproyal.com" },
      { platform: "discord", url: "https://discord.com/invite/SUA5yjpnZQ" },
      { platform: "x", url: "https://x.com/IPRoyal_proxies" },
      { platform: "facebook", url: "https://www.facebook.com/IProyal/" },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/company/iproyal/",
      },
      { platform: "youtube", url: "https://www.youtube.com/@IPRoyalOfficial" },
    ],
  },
  {
    slug: "netnut",
    name: "NetNut",
    logo: "/providers/netnut.svg",
    summary:
      "85M+ residential IPs with ISP-based network for fast speeds. Direct ISP connectivity reduces latency.",
    url: "https://netnut.io?ref=odblmzc&utm_source=get-proxies&utm_campaign=soulfire",
    badges: ["high-quality", "residential", "isp"],
    paymentMethods: [
      "PayPal",
      "Visa",
      "Mastercard",
      "Amex",
      "Bank wire",
      "Bitcoin",
    ],
    socialLinks: [
      { platform: "email", url: "mailto:sales@netnut.io" },
      { platform: "facebook", url: "https://www.facebook.com/NetNut.io" },
      { platform: "x", url: "https://twitter.com/netnut_io" },
      { platform: "linkedin", url: "https://www.linkedin.com/company/netnut/" },
      { platform: "discord", url: "https://discord.gg/BUjgwh6eVG" },
      { platform: "telegram", url: "https://t.me/netnut_io" },
    ],
  },
];

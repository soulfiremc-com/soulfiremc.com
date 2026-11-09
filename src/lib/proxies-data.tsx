import type { MessageKey } from "@/lib/messages";
import {
  Building2,
  Gift,
  Globe,
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

export type Badge = FilterableBadge | "bedrock-udp";

export type Provider = {
  slug: string;
  name: string;
  logo?: string;
  summary: MessageKey;
  url: string;
  badges: Badge[];
  couponCode?: string;
  couponDiscount?: MessageKey;
  startDate?: string;
  gallery?: { src: string; alt: MessageKey }[];
  paymentMethods?: string[];
  socialLinks?: SocialLink[];
};

export const BADGE_CONFIG: Record<
  Badge,
  {
    label: MessageKey;
    className: string;
    description: MessageKey;
    icon: React.ReactNode;
  }
> = {
  "free-tier": {
    label: "providers.badges.free-tier.label",
    className: "bg-success/10 text-success",
    description: "providers.proxies.badges.free-tier.description",
    icon: <Gift className="h-3 w-3" />,
  },
  "high-quality": {
    label: "providers.badges.high-quality.label",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description: "providers.proxies.badges.high-quality.description",
    icon: <Star className="h-3 w-3" />,
  },
  residential: {
    label: "providers.badges.residential.label",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    description: "providers.proxies.badges.residential.description",
    icon: <Home className="h-3 w-3" />,
  },
  datacenter: {
    label: "providers.badges.datacenter.label",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description: "providers.proxies.badges.datacenter.description",
    icon: <Building2 className="h-3 w-3" />,
  },
  "unlimited-bandwidth": {
    label: "providers.badges.unlimited-bandwidth.label",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description: "providers.proxies.badges.unlimited-bandwidth.description",
    icon: <InfinityIcon className="h-3 w-3" />,
  },
  "bedrock-udp": {
    label: "providers.badges.bedrock-udp.label",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    description: "providers.proxies.badges.bedrock-udp.description",
    icon: <Network className="h-3 w-3" />,
  },
  "budget-friendly": {
    label: "providers.badges.budget-friendly.label",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description: "providers.proxies.badges.budget-friendly.description",
    icon: <Globe className="h-3 w-3" />,
  },
  enterprise: {
    label: "providers.badges.enterprise.label",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    description: "providers.proxies.badges.enterprise.description",
    icon: <Building2 className="h-3 w-3" />,
  },
  isp: {
    label: "providers.badges.isp.label",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    description: "providers.proxies.badges.isp.description",
    icon: <Wifi className="h-3 w-3" />,
  },
  mobile: {
    label: "providers.badges.mobile.label",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    description: "providers.proxies.badges.mobile.description",
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
  {
    slug: "legionproxy",
    name: "LegionProxy",
    logo: "/providers/legionproxy.png",
    summary: "providers.proxies.legionproxy.summary",
    url: "https://legionproxy.io/?utm_source=github&utm_campaign=soulfire",
    badges: [
      "bedrock-udp",
      "budget-friendly",
      "unlimited-bandwidth",
      "residential",
      "datacenter",
      "isp",
    ],
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
    summary: "providers.proxies.proxy-seller.summary",
    url: "https://proxy-seller.com/?utm_source=soulfiremc&utm_medium=referral&utm_campaign=partner_promo&utm_term=soulfiremc&partner=GRJY71PA3XWPPP",
    badges: ["budget-friendly", "datacenter", "isp", "mobile", "residential"],
    couponCode: "SOULFIREMC",
    couponDiscount: "providers.proxies.proxy-seller.couponDiscount",
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
    summary: "providers.proxies.thordata.summary",
    url: "https://affiliate.thordata.com/soulfire?utm_source=get-proxies&utm_campaign=soulfire",
    badges: ["bedrock-udp", "high-quality", "residential", "mobile", "isp"],
    couponCode: "THORDATA",
    couponDiscount: "offers.twentyPercentOff",
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
    summary: "providers.proxies.webshare.summary",
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
    summary: "providers.proxies.proxyscrape.summary",
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
    summary: "providers.proxies.plainproxies.summary",
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
    summary: "providers.proxies.flameproxies.summary",
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
      { platform: "telegram", url: "https://t.me/flameproxies" },
    ],
  },
  {
    slug: "flashproxy",
    name: "FlashProxy",
    logo: "/providers/flashproxy.png",
    summary: "providers.proxies.flashproxy.summary",
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
  {
    slug: "loopway",
    name: "Loopway",
    logo: "/providers/loopway.svg",
    summary: "providers.proxies.loopway.summary",
    url: "https://app.loopway.io/sign-up?ref=soulfire",
    badges: [
      "bedrock-udp",
      "free-tier",
      "budget-friendly",
      "unlimited-bandwidth",
      "residential",
      "datacenter",
      "isp",
      "mobile",
    ],
    paymentMethods: [
      "Visa",
      "Mastercard",
      "PayPal",
      "Ethereum",
      "USDT",
      "Solana",
    ],
    socialLinks: [
      { platform: "email", url: "mailto:team@loopway.io" },
      { platform: "discord", url: "https://discord.gg/qrB786CqGf" },
    ],
  },
  {
    slug: "serpproxies",
    name: "SerpProxies",
    logo: "/providers/serpproxies.svg",
    summary: "providers.proxies.serpproxies.summary",
    url: "https://app.serpproxies.com/sign-up?ref=soulfire",
    badges: [
      "bedrock-udp",
      "free-tier",
      "budget-friendly",
      "unlimited-bandwidth",
      "residential",
      "datacenter",
      "isp",
      "mobile",
    ],
    paymentMethods: [
      "Visa",
      "Mastercard",
      "PayPal",
      "Ethereum",
      "USDT",
      "Solana",
    ],
    socialLinks: [
      { platform: "email", url: "mailto:team@serpproxies.com" },
      { platform: "discord", url: "https://discord.gg/serpproxies" },
      { platform: "x", url: "https://x.com/SerpProxies" },
      { platform: "telegram", url: "https://t.me/serpproxies" },
    ],
  },
  // Enterprise tier
  {
    slug: "bright-data",
    name: "Bright Data",
    logo: "/providers/brightdata.png",
    summary: "providers.proxies.bright-data.summary",
    url: "https://brightdata.com/?utm_source=get-proxies&utm_campaign=soulfire",
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
    summary: "providers.proxies.oxylabs.summary",
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
    summary: "providers.proxies.decodo.summary",
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
    summary: "providers.proxies.iproyal.summary",
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
];

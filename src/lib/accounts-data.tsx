import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Gift,
  Handshake,
  Heart,
  Package,
  Plug,
  Shield,
  Star,
  Zap,
} from "lucide-react";

import type {
  SocialLink,
  SocialPlatform,
} from "@/components/social-link-buttons";

export type { SocialLink, SocialPlatform };

export type FilterableBadge =
  | "free"
  | "high-quality"
  | "instant-delivery"
  | "replacement-warranty"
  | "lifetime-warranty"
  | "12h-warranty"
  | "bulk-discount";

export type Badge =
  | FilterableBadge
  | "official-integration"
  | "partner"
  | "affiliate";

export type ProviderThemeName = "localts" | "fernan" | "alts-fast";

export type ProviderTheme = {
  ring: string;
  bg: string;
  cardShadow: string;
  badge: string;
  logo: string;
  price: string;
  primaryButton: string;
  secondaryButton: string;
};

export type Category = "nfa-accounts" | "mfa-accounts";

export type SortOption = "default" | "best-rated" | "price-asc" | "price-desc";

export type Listing = {
  summary: string;
  badges: Badge[];
  price: string;
  // USD catalog price, when a comparable account price is available.
  priceValue?: number;
  couponCode?: string;
  couponDiscount?: string;
  linkDiscountMessage?: string;
  priceDetails?: string;
};

export type Shop = {
  slug: string;
  name: string;
  logo?: string;
  logoUnoptimized?: boolean;
  theme?: ProviderThemeName;
  url: string;
  websiteUrl?: string;
  discordUrl?: string;
  trustpilotUrl?: string;
  socialLinks?: SocialLink[];
  paymentMethods?: string[];
  startDate?: string;
  gallery?: { src: string; alt: string }[];
  promotedUntil?: string;
  listings: Partial<Record<Category, Listing>>;
};

export type Provider = {
  slug: string;
  name: string;
  logo?: string;
  logoUnoptimized?: boolean;
  theme?: ProviderThemeName;
  summary: string;
  url: string;
  websiteUrl?: string;
  discordUrl?: string;
  trustpilotUrl?: string;
  socialLinks?: SocialLink[];
  paymentMethods?: string[];
  startDate?: string;
  gallery?: { src: string; alt: string }[];
  promotedUntil?: string;
  badges: Badge[];
  category: Category;
  price: string;
  priceValue?: number;
  couponCode?: string;
  couponDiscount?: string;
  linkDiscountMessage?: string;
  priceDetails?: string;
};

export function isProviderPromoted(
  provider: Pick<Provider, "promotedUntil">,
  now = Date.now(),
): boolean {
  return (
    provider.promotedUntil !== undefined &&
    now < Date.parse(provider.promotedUntil)
  );
}

export function compareProviderPrices(
  a: Pick<Provider, "priceValue">,
  b: Pick<Provider, "priceValue">,
  sort: "price-asc" | "price-desc",
): number {
  if (a.priceValue === undefined) {
    return b.priceValue === undefined ? 0 : 1;
  }
  if (b.priceValue === undefined) {
    return -1;
  }
  return sort === "price-asc"
    ? a.priceValue - b.priceValue
    : b.priceValue - a.priceValue;
}

export function getDiscordInviteUrl(
  provider: Pick<Provider, "discordUrl" | "url">,
): string | null {
  const discordLink = provider.discordUrl ?? provider.url;
  return /(discord\.gg|discord\.com\/invite)/i.test(discordLink) ||
    provider.discordUrl
    ? discordLink
    : null;
}

export const PROVIDER_THEMES: Record<ProviderThemeName, ProviderTheme> = {
  localts: {
    ring: "ring-localts-blue/25 dark:ring-localts-sky/20",
    bg: "border-localts-blue/25 bg-localts-sky/10 dark:border-localts-sky/20 dark:bg-localts-navy/35",
    cardShadow: "shadow-sm shadow-localts-navy/10 dark:shadow-none",
    badge:
      "border border-localts-blue/25 bg-localts-blue/10 text-localts-navy dark:border-localts-sky/25 dark:bg-localts-sky/10 dark:text-localts-sky",
    logo: "ring-2 ring-localts-blue/30 bg-white dark:ring-localts-sky/30",
    price:
      "border border-localts-blue/25 bg-white text-localts-navy dark:border-localts-sky/25 dark:bg-localts-blue/20 dark:text-localts-sky",
    primaryButton:
      "bg-localts-navy text-white hover:bg-localts-blue dark:bg-localts-sky dark:text-localts-navy dark:hover:bg-localts-sky/85",
    secondaryButton:
      "border border-localts-blue/25 bg-white/80 text-localts-navy hover:bg-localts-sky/20 dark:border-localts-sky/20 dark:bg-localts-navy/60 dark:text-localts-sky dark:hover:bg-localts-blue/25",
  },
  fernan: {
    ring: "ring-amber-400/45 dark:ring-amber-300/30",
    bg: "border-amber-400/30 bg-amber-50/65 dark:border-amber-300/20 dark:bg-amber-950/20",
    cardShadow: "shadow-[0_12px_30px_-22px_rgba(217,119,6,0.65)]",
    badge:
      "border border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
    logo: "ring-2 ring-amber-400/40 bg-amber-100 shadow-sm dark:bg-amber-100/90",
    price:
      "border border-amber-500/30 bg-amber-100/80 text-amber-900 dark:bg-amber-300/15 dark:text-amber-200",
    primaryButton:
      "bg-red-600 text-white hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400",
    secondaryButton:
      "border border-amber-500/25 bg-amber-100/70 text-amber-950 hover:bg-amber-200/70 dark:bg-amber-300/10 dark:text-amber-100 dark:hover:bg-amber-300/15",
  },
  "alts-fast": {
    ring: "ring-cyan-500/35 dark:ring-cyan-300/25",
    bg: "border-cyan-500/25 bg-cyan-50/55 dark:border-cyan-300/20 dark:bg-cyan-950/20",
    cardShadow: "shadow-[0_12px_30px_-22px_rgba(8,145,178,0.65)]",
    badge:
      "border border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    logo: "ring-2 ring-cyan-500/40 bg-cyan-950 shadow-sm",
    price:
      "border border-amber-500/30 bg-amber-100/80 text-amber-900 dark:bg-amber-300/15 dark:text-amber-200",
    primaryButton:
      "bg-cyan-700 text-white hover:bg-cyan-600 dark:bg-cyan-400 dark:text-cyan-950 dark:hover:bg-cyan-300",
    secondaryButton:
      "border border-cyan-500/25 bg-cyan-100/70 text-cyan-950 hover:bg-cyan-200/70 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-cyan-300/15",
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
  free: {
    label: "Free",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description:
      "Accounts are available completely for free - no purchase required.",
    icon: <Gift className="h-3 w-3" />,
  },
  "high-quality": {
    label: "High Quality",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description:
      "Premium accounts with high reliability and low ban rates. Best for demanding use cases.",
    icon: <Star className="h-3 w-3" />,
  },
  "instant-delivery": {
    label: "Instant Delivery",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    description:
      "Accounts are delivered automatically and instantly after purchase - no waiting required.",
    icon: <Zap className="h-3 w-3" />,
  },
  "replacement-warranty": {
    label: "Replacement Warranty",
    className: "bg-success/10 text-success",
    description:
      "Replacement coverage is available if an account stops working, subject to the shop's warranty terms.",
    icon: <Shield className="h-3 w-3" />,
  },
  "lifetime-warranty": {
    label: "Lifetime Warranty",
    className: "bg-success/10 text-success",
    description:
      "Accounts come with lifetime warranty - get a replacement if your account stops working.",
    icon: <Shield className="h-3 w-3" />,
  },
  "12h-warranty": {
    label: "Fair Warranty",
    className: "bg-yellow-500/10 text-warning dark:text-yellow-400",
    description:
      "Accounts come with a 12 hour warranty - get a replacement if your account stops working within 12 hours of purchase.",
    icon: <Shield className="h-3 w-3" />,
  },
  "bulk-discount": {
    label: "Bulk Discount",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description:
      "Significant discounts available when purchasing accounts in bulk quantities.",
    icon: <Package className="h-3 w-3" />,
  },
  "official-integration": {
    label: "Official Integration",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description:
      "This provider is officially integrated into the SoulFire client. You can purchase and import accounts directly from within the app.",
    icon: <Plug className="h-3 w-3" />,
  },
  partner: {
    label: "Partner",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    description:
      "This provider partners with SoulFire and supports the project.",
    icon: <Heart className="h-3 w-3 fill-current" />,
  },
  affiliate: {
    label: "Affiliate",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    description:
      "Buying with this provider's code or link supports SoulFire at no extra cost to you.",
    icon: <Handshake className="h-3 w-3" />,
  },
};

export const CATEGORY_CONFIG: Record<
  Category,
  { label: string; description: string }
> = {
  "nfa-accounts": {
    label: "NFA Accounts",
    description:
      "Temporary Minecraft alts, often sold as token or cookie accounts",
  },
  "mfa-accounts": {
    label: "MFA Accounts",
    description: "Full-access permanent Minecraft accounts you own long-term",
  },
};

export const SORT_CONFIG: Record<
  SortOption,
  { label: string; icon?: React.ReactNode }
> = {
  default: {
    label: "Most Rated",
    icon: <Star className="h-3 w-3" />,
  },
  "best-rated": {
    label: "Best Rated",
    icon: <Star className="h-3 w-3 fill-current" />,
  },
  "price-asc": {
    label: "Price: Low to High",
    icon: <ArrowUpNarrowWide className="h-3 w-3" />,
  },
  "price-desc": {
    label: "Price: High to Low",
    icon: <ArrowDownNarrowWide className="h-3 w-3" />,
  },
};

export const FILTER_BADGES: FilterableBadge[] = [
  "free",
  "high-quality",
  "instant-delivery",
  "replacement-warranty",
  "lifetime-warranty",
  "bulk-discount",
];

export const FILTER_CATEGORIES: Category[] = ["mfa-accounts", "nfa-accounts"];

export const SORT_OPTIONS: SortOption[] = [
  "default",
  "best-rated",
  "price-asc",
  "price-desc",
];

// Shop order is arranged to preserve the recommended sort order
// within both NFA and MFA category sections when derived into PROVIDERS.
export const SHOPS: Shop[] = [
  {
    slug: "ravealts",
    name: "Ravealts",
    logo: "/accounts/ravealts.gif",
    logoUnoptimized: true,
    url: "https://ravealts.com?via=soulfire",
    websiteUrl: "https://ravealts.com?via=soulfire",
    discordUrl: "https://discord.ravealts.com",
    trustpilotUrl: "https://www.trustpilot.com/review/ravealts.com",
    paymentMethods: [
      "Crypto",
      "Link",
      "Card",
      "Apple Pay",
      "Google Pay",
      "Klarna",
      "EPS",
      "Bancontact",
      "Amazon Pay",
      "Cash App",
      "Bank Transfer",
    ],
    socialLinks: [
      { platform: "youtube", url: "https://www.youtube.com/@ravealts" },
      { platform: "tiktok", url: "https://www.tiktok.com/@ravealts" },
      { platform: "telegram", url: "https://t.me/ravealtsofficial" },
      { platform: "x", url: "https://x.com/ravealts" },
    ],
    startDate: "Jul 2025",
    listings: {
      "nfa-accounts": {
        summary:
          "Credit-based dashboard with instant delivery, live validation, API access, and public credit packs. Also sells Dispenser keys for automated bulk generation.",
        badges: [
          "affiliate",
          "official-integration",
          "high-quality",
          "instant-delivery",
          "bulk-discount",
        ],
        price: "10-15¢",
        priceValue: 0.1,
        couponCode: "SOULFIRE",
        couponDiscount: "10% off",
        priceDetails:
          "Public checkout currently sells 500 credits for $4.99, 1000 for $8.99, 2000 for $15.99, plus a $5 VIP key. Dispenser keys are $19.99 (1 month), $44.99 (3 months), $69.99 (6 months), and $99.99 (1 year). Invalid accounts are auto-refunded when precheck fails.",
      },
      "mfa-accounts": {
        summary:
          "Permanent accounts with full access. Change email, password and username. Also sells Microsoft/Xbox accounts with Game Pass and Bedrock. Accepts crypto, card, Klarna and more.",
        badges: [
          "affiliate",
          "official-integration",
          "high-quality",
          "lifetime-warranty",
        ],
        price: "$5.67",
        priceValue: 5.67,
        couponCode: "SOULFIRE",
        couponDiscount: "10% off",
      },
    },
  },
  {
    slug: "fernan",
    name: "Fernan's Club",
    logo: "/accounts/fernan.webp",
    theme: "fernan",
    url: "https://fernan.club",
    websiteUrl: "https://fernan.club",
    discordUrl: "https://alts.fernan.club",
    paymentMethods: [
      "Litecoin",
      "Card",
      "Crypto",
      "Paysafecard",
      "Apple Pay",
      "Google Pay",
      "PayPal",
      "WeChat Pay",
      "Alipay",
    ],
    startDate: "Jul 2025",
    listings: {
      "nfa-accounts": {
        summary:
          "Cookie NFAs for Hypixel, DonutSMP, and GommeHD, with live stock, server-specific tiers, and API access for automated purchases.",
        badges: ["affiliate", "instant-delivery"],
        price: "5¢+",
        priceValue: 0.05,
        couponCode: "SOULFIRE",
        couponDiscount: "10% off",
        priceDetails:
          "Current cookie prices start at 5¢ for generic Hypixel-banned accounts, 10¢ for DonutSMP or GommeHD unbanned, and 15¢ for Hypixel level 1-9. Higher-level, ranked, Bedwars, Skyblock, and DonutSMP balance tiers are also available. Eligible unused cookie products have a 24-hour refund window.",
      },
      "mfa-accounts": {
        summary:
          "Full-access Minecraft credentials and game codes, including Hypixel fresh, unbanned, banned, and ranked account tiers.",
        badges: ["affiliate", "instant-delivery"],
        price: "$4.00+",
        priceValue: 4,
        couponCode: "SOULFIRE",
        couponDiscount: "10% off",
        priceDetails:
          "MFA credentials currently start at $4 for Hypixel-banned accounts, $5.50 for Hypixel-unbanned, and $6.50 for fresh Hypixel status. Game codes cost $7.50, low-rank accounts cost $8.50, and high-rank accounts cost $15. MFA products include lifetime coverage for Microsoft compliance locks, subject to the shop's warranty terms.",
      },
    },
  },
  {
    slug: "atomic-nfas",
    name: "Atomic NFAs",
    logo: "/accounts/atomic-nfas.webp",
    url: "https://atomic-nfas.mysellauth.com",
    websiteUrl: "https://atomic-nfas.mysellauth.com",
    discordUrl: "https://dsc.gg/atomicnfas",
    startDate: "Jan 2026",
    listings: {
      "nfa-accounts": {
        summary:
          "Credit packs and timed generator access for inexpensive NFAs, delivered through a SellAuth storefront with live stock.",
        badges: ["instant-delivery", "bulk-discount"],
        price: "0.8-1¢/credit",
        priceValue: 0.008,
        couponCode: "SOULFIRE",
        couponDiscount: "10% off",
        priceDetails:
          "Credit packs currently cost $1 for 100, $2 for 200, $4 for 500, or $8 for 1,000. Generator access costs $3 for one week, $4 for one month, $10 for three months, or $20 for one year.",
      },
    },
  },
  {
    slug: "luma-mfa",
    name: "Luma MFA",
    logo: "/accounts/luma.png",
    url: "https://discord.gg/5Wc4tA2ypY",
    paymentMethods: ["Crypto", "PayPal"],
    startDate: "Nov 2025",
    listings: {
      "mfa-accounts": {
        summary:
          "Full access accounts that work well as mains or long-term alts. Over 100 accounts sold since launch.",
        badges: ["high-quality", "instant-delivery", "12h-warranty"],
        price: "$5.00",
        priceValue: 4.5,
        couponCode: "SOULFIRE",
        couponDiscount: "5% off",
      },
    },
  },
  {
    slug: "nicealts",
    name: "Nicealts",
    logo: "/accounts/nicealts.png",
    url: "https://nicealts.com",
    websiteUrl: "https://nicealts.com",
    trustpilotUrl: "https://www.trustpilot.com/review/nicealts.com",
    paymentMethods: [
      "Card",
      "Amazon Pay",
      "Apple Pay",
      "Google Pay",
      "Crypto",
      "Link",
    ],
    startDate: "Mar 2025",
    listings: {
      "nfa-accounts": {
        summary:
          "Multiple tiers from budget tokens to high-quality cookies. Responsive support.",
        badges: ["high-quality", "instant-delivery", "bulk-discount"],
        price: "5-10¢",
        priceValue: 0.05,
      },
    },
  },
  {
    slug: "aqua-mfa",
    name: "Aqua MFA",
    logo: "/accounts/aquamfa.png",
    url: "https://discord.gg/87XFhsS35V",
    paymentMethods: ["BLIK", "Crypto", "Card"],
    startDate: "Aug 2025",
    listings: {
      "mfa-accounts": {
        summary:
          "Cheap MFA accounts with instant delivery, lifetime warranty, and over 825 accounts sold.",
        badges: ["high-quality", "instant-delivery", "lifetime-warranty"],
        price: "$4.00-$5.50",
        priceValue: 4.0,
        couponCode: "SOULFIRE",
        couponDiscount: "5% off",
      },
    },
  },
  {
    slug: "4d4p-shop",
    name: "4D4P Shop",
    logo: "/accounts/4d4p.webp",
    url: "https://4d4pshop.com/products/minecraft-accounts",
    websiteUrl: "https://4d4pshop.com",
    discordUrl: "https://discord.com/invite/4d4pshop",
    trustpilotUrl: "https://www.trustpilot.com/review/4d4pshop.com",
    paymentMethods: [
      "Card",
      "Apple Pay",
      "Google Pay",
      "Crypto",
      "Binance Gift Card (PayPal/Paysafecard/Skrill)",
    ],
    socialLinks: [{ platform: "telegram", url: "https://t.me/shop4d4ps" }],
    startDate: "Jan 2019",
    listings: {
      "mfa-accounts": {
        summary:
          "Full-access Minecraft account store operating since 2019 with Hypixel and DonutSMP unbanned accounts, Hypixel ranked accounts, rare cape accounts, and 4-letter usernames. Public feedback shows 600+ customer reviews, and orders advertise instant automated delivery plus lifetime warranty.",
        badges: ["high-quality", "instant-delivery", "lifetime-warranty"],
        price: "$7.50+",
        priceValue: 7.5,
        couponCode: "SOULFIRE",
        couponDiscount: "5% off",
        priceDetails:
          "Public Minecraft catalog lists Hypixel and DonutSMP full-access accounts from $7.50, Hypixel ranked accounts from $11-$20, 4-letter usernames from $15, and cape accounts from $8.50+.",
      },
    },
  },
  {
    slug: "alts-fast",
    name: "Alts.fast",
    logo: "/accounts/altsfast.png",
    theme: "alts-fast",
    url: "https://alts.fast/?referral=SOULFIRE",
    websiteUrl: "https://alts.fast",
    discordUrl: "https://alts.fast/discord",
    paymentMethods: [
      "Card",
      "Apple Pay",
      "Google Pay",
      "Bank Transfer",
      "PIX",
      "Crypto",
    ],
    socialLinks: [{ platform: "telegram", url: "https://t.me/altsfast" }],
    startDate: "May 2026",
    listings: {
      "mfa-accounts": {
        summary:
          "Full-access accounts pre-checked on Hypixel and DonutSMP before delivery, with a 7-day replacement warranty (permanent against locks) and automated instant delivery. Also offers Hypixel ranked, DonutSMP playtime, and caped accounts.",
        badges: ["affiliate", "high-quality", "instant-delivery"],
        price: "$7.99+",
        priceValue: 7.99,
        linkDiscountMessage:
          "Register using the link below for a 10% discount at checkout",
        priceDetails:
          "Regular alts start at $7.99 (clean or Hypixel-banned tiers), Hypixel ranked from $13.99, caped accounts from $11.00, and DonutSMP playtime accounts from $3.00. Every order includes a 7-day replacement warranty with free replacements and no forms, plus permanent warranty against account locks. Card and Apple Pay deliver in seconds, crypto confirms within minutes.",
      },
    },
  },
  {
    slug: "zzxgp",
    name: "ZZXGP",
    logo: "/accounts/zzxgp.png",
    url: "https://zzxgp.me",
    websiteUrl: "https://shop.zzxgp.me",
    discordUrl: "https://discord.zzxgp.me",
    paymentMethods: ["Crypto"],
    startDate: "Dec 2025",
    listings: {
      "nfa-accounts": {
        summary:
          "Public website now sells Discord bot token packs rather than listing individual alts directly. Landing page advertises instant delivery, crypto payments, and premium stock redeemed through the server bot.",
        badges: ["instant-delivery"],
        price: "1¢/token",
        priceValue: 0.01,
        priceDetails:
          "Current public shop lists 100 tokens for $1, 200 for $2, and 500 for $5. Terms advertise replacements for invalid or banned-on-delivery alts, with 10 minute NFA warranty and 1-2 hour MC token warranties.",
      },
      "mfa-accounts": {
        summary:
          "Public WooCommerce shop currently lists a dedicated MFA SKU (`mfa 1+ no ban check`) at $4.50.",
        badges: ["instant-delivery"],
        price: "$4.50",
        priceValue: 4.5,
        priceDetails:
          "Current public sale price is $4.50, down from $5. Terms say invalid or banned-on-delivery alts are replaced if stock is available, and XGP alts have a 24 hour warranty.",
      },
    },
  },
  {
    slug: "yyy",
    name: "YYY",
    logo: "/accounts/yyy.png",
    url: "https://discord.gg/rmxayvwc5K",
    paymentMethods: ["Discord checkout"],
    startDate: "Apr 2025",
    listings: {
      "nfa-accounts": {
        summary: "Cookie and token accounts with their own delivery platform.",
        badges: ["high-quality", "instant-delivery"],
        price: "12¢",
        priceValue: 0.12,
      },
    },
  },
  {
    slug: "mog-alts",
    name: "Mog Alts",
    logo: "/accounts/mogalts.png",
    url: "https://mogalts.win",
    websiteUrl: "https://mogalts.win",
    discordUrl: "https://discord.gg/mogalts",
    paymentMethods: [
      "Apple Pay",
      "Google Pay",
      "Crypto",
      "Card",
      "Bancontact",
      "EPS",
      "Cash App",
      "Bank Transfer",
    ],
    startDate: "Nov 2025",
    listings: {
      "nfa-accounts": {
        summary:
          "Credit-based storefront with Discord redemption, live stock, 24/7 support, and card plus crypto payments.",
        badges: ["instant-delivery", "bulk-discount"],
        price: "0.80-1.29¢/credit",
        priceValue: 0.008,
        priceDetails:
          "Current public tiers are 100 credits for $1.29, 200 for $2.09, 500 for $4.79, 1K for $8.79, and 2.5K for $19.99. Site advertises instant delivery, Discord redemption, Apple Pay/Google Pay, and BTC/LTC.",
      },
    },
  },
  {
    slug: "localts",
    name: "Localts",
    promotedUntil: "2026-12-28T14:42:46+01:00",
    logo: "/accounts/localts.png",
    theme: "localts",
    url: "https://localts.store/?campaign=soulfire",
    websiteUrl: "https://localts.info",
    discordUrl: "https://invite.localts.store",
    trustpilotUrl: "https://www.trustpilot.com/review/localts.store",
    paymentMethods: [
      "Crypto",
      "Card",
      "Apple Pay",
      "Google Pay",
      "Link",
      "Amazon Pay",
    ],
    startDate: "Jun 2023",
    listings: {
      "nfa-accounts": {
        summary:
          "Cookie NFAs with multiple Hypixel tiers, random rank options, and no-VPN-detection variants on higher levels.",
        badges: ["partner", "affiliate", "high-quality", "instant-delivery"],
        price: "12-16¢",
        priceValue: 0.12,
        linkDiscountMessage:
          "Register using the link below for a 5% discount on checkout",
        priceDetails:
          "Cookie NFAs cost 12-16¢. Higher Hypixel tiers and ranked variants cost more. Terms advertise replacements within 24 hours.",
      },
      "mfa-accounts": {
        summary:
          "Full-access accounts with instant delivery, 7+ day age, and OTP secret included. Ranked variants are available above the base tier.",
        badges: ["partner", "affiliate", "high-quality", "instant-delivery"],
        price: "$5.99+",
        priceValue: 5.99,
        linkDiscountMessage:
          "Register using the link below for a 5% discount on checkout",
        priceDetails:
          "Base no-rank full access starts at $5.99. Fresh Hypixel stats is $7.49, ranked variants start at $8.49, and their Terms advertise replacements within 24 hours.",
      },
    },
  },
  {
    slug: "skycron",
    name: "Skycron",
    logo: "/accounts/skycron.png",
    url: "https://skycron.mysellauth.com",
    websiteUrl: "https://skycron.mysellauth.com",
    discordUrl: "https://discord.gg/5sZNDb4UMy",
    paymentMethods: ["Crypto", "PayPal", "Rewarble Gift Card (Card)"],
    startDate: "Feb 2026",
    listings: {
      "nfa-accounts": {
        summary:
          "Discord bot-based NFA generator with Hypixel, DonutSMP, Minemen, GommeHD, and CubeCraft unbans plus banned alts. Short cooldowns keep generation moving.",
        badges: ["instant-delivery"],
        price: "Subscription",
        priceValue: 0,
        couponCode: "SOULFIRE",
        couponDiscount: "5% off",
        priceDetails:
          "Generator access runs through the Discord bot. Includes Hypixel, DonutSMP, Minemen, GommeHD, and CubeCraft unbans.",
      },
    },
  },
  {
    slug: "lunaralts",
    name: "LunarAlts",
    logo: "/accounts/lunaralts.png",
    url: "https://lunaralts.xyz",
    websiteUrl: "https://lunaralts.xyz",
    discordUrl: "https://discord.gg/aeuY56KBrG",
    paymentMethods: ["Crypto"],
    startDate: "May 2026",
    listings: {
      "nfa-accounts": {
        summary:
          "Premium cookie NFAs with multiple ban-check tiers, from Hypixel-banned budget alts up to Hypixel-unbanned accounts. Instant delivery through a SellAuth checkout.",
        badges: ["high-quality", "instant-delivery"],
        price: "2-10¢",
        priceValue: 0.02,
        priceDetails:
          "Prices range from 2¢ for Hypixel-banned alts up to 10¢ for Hypixel-unbanned accounts, with various ban checks available. Accounts are delivered instantly after checkout.",
      },
    },
  },
  {
    slug: "kynoselling",
    name: "KynoSelling",
    logo: "/accounts/kynoselling.png",
    url: "https://kynoselling.xyz/?ref=SOULFIRE",
    websiteUrl: "https://kynoselling.xyz/?ref=SOULFIRE",
    discordUrl: "https://kynoselling.xyz/discord",
    paymentMethods: ["Crypto (LTC, BTC, SOL)", "Card"],
    listings: {
      "nfa-accounts": {
        summary:
          "Budget Minecraft NFA alts with instant automated delivery (<30s). Pre-checked Hypixel, Donut unban guarantee, replacement warranty, and 24/7 support.",
        badges: [
          "affiliate",
          "instant-delivery",
          "high-quality",
          "replacement-warranty",
        ],
        price: "8¢",
        priceValue: 0.08,
        couponCode: "SOULFIRE10",
        couponDiscount: "10% off",
        priceDetails:
          "Shop pricing ranges from $0.08 to $5.99 across budget NFA alts and full-email-access MFA accounts.",
      },
      "mfa-accounts": {
        summary:
          "Verified Minecraft MFAs (Full Email Access) with instant automated delivery (<30s). Pre-checked Hypixel, Donut unban guarantee, replacement warranty, and 24/7 support.",
        badges: [
          "affiliate",
          "instant-delivery",
          "high-quality",
          "replacement-warranty",
        ],
        price: "$5.99",
        priceValue: 5.99,
        couponCode: "SOULFIRE10",
        couponDiscount: "10% off",
        priceDetails:
          "Shop pricing ranges from $0.08 to $5.99 across budget NFA alts and full-email-access MFA accounts.",
      },
    },
  },
  // Verified 2026-11-01. Sources and limitations: docs/account-shop-research.md.
  {
    slug: "altsgreat",
    name: "AltsGreat",
    logo: "/accounts/altsgreat.png",
    url: "https://altsgreat.com/categories/minecraft-accounts",
    websiteUrl: "https://altsgreat.com",
    trustpilotUrl: "https://www.trustpilot.com/review/altsgreat.com",
    paymentMethods: ["Card", "Crypto"],
    listings: {
      "mfa-accounts": {
        summary:
          "Full-access Java and Bedrock accounts, including Hypixel ranked, Bedwars, Skyblock, DonutSMP, and cape listings. Several account purchase buttons lead to Eldorado checkout, so review the linked offer's seller, price, and terms.",
        badges: [],
        price: "$6.99+",
        priceValue: 6.99,
        priceDetails:
          "The catalog advertises Hypixel-unbanned full-access accounts at $6.99, DonutSMP-unbanned at $8.99, fresh Java + Bedrock at $9.99, VIP at $10.49, and MVP+ at $25.99. Confirm the final price and delivery terms on the linked checkout. Warranties vary by product. The refund policy requests reports of technical problems within 24 hours and offers a refund if support cannot fix or replace a faulty product.",
      },
    },
  },
  {
    slug: "fastalts",
    name: "FastAlts",
    logo: "/accounts/fastalts.svg",
    url: "https://fastalts.com/minecraft/account",
    websiteUrl: "https://fastalts.com",
    trustpilotUrl: "https://www.trustpilot.com/review/fastalts.com",
    paymentMethods: ["Visa", "Mastercard", "Apple Pay", "Google Pay"],
    socialLinks: [{ platform: "email", url: "mailto:support@fastalts.com" }],
    listings: {
      "mfa-accounts": {
        summary:
          "Full-access Minecraft accounts with the linked email inbox, including Java + Bedrock and specific cape pools. Advertises automatic delivery after payment, escrow, and a 30-day replacement guarantee for defects present at delivery.",
        badges: ["instant-delivery", "replacement-warranty"],
        price: "$18.99+",
        priceValue: 18.99,
        priceDetails:
          "The standard full-access listing publishes a USD price of $18.99; the storefront can display local currencies. Cape listings include Migrator, Vanilla, Followers, Purple Heart, Pan, and multiple-cape options. Only explicitly listed account traits are guaranteed. Report problems from the order page before confirming receipt. The 30-day guarantee covers defects present at delivery, with replacement first and a refund if no valid replacement exists.",
      },
    },
  },
  {
    slug: "eldorado",
    name: "Eldorado",
    logo: "/accounts/eldorado.png",
    url: "https://www.eldorado.gg/minecraft-accounts/a/61-1-0",
    websiteUrl: "https://www.eldorado.gg",
    trustpilotUrl: "https://www.trustpilot.com/review/eldorado.gg",
    paymentMethods: [
      "Card",
      "Apple Pay",
      "Google Pay",
      "PayPal",
      "Crypto",
      "Klarna",
      "BLIK",
      "Cash App",
      "Alipay",
      "PIX",
      "Local methods",
    ],
    socialLinks: [
      { platform: "x", url: "https://x.com/EldoradoGg" },
      {
        platform: "youtube",
        url: "https://www.youtube.com/@Eldorado.gg_Official",
      },
      { platform: "tiktok", url: "https://www.tiktok.com/@eldoradogg1" },
      {
        platform: "instagram",
        url: "https://www.instagram.com/eldoradogg_official/",
      },
      {
        platform: "facebook",
        url: "https://www.facebook.com/eldoradogg.official/",
      },
    ],
    startDate: "2018",
    listings: {
      "mfa-accounts": {
        summary:
          "Marketplace for full-access Minecraft accounts, including Java + Bedrock, Hypixel ranked, Skyblock, Bedwars, and cape listings. Compare each seller's account details and delivery time. TradeShield holds payment through the order protection period.",
        badges: [],
        price: "Varies by seller",
        priceDetails:
          "Prices vary by seller, edition, account progress, and capes. The category also contains temporary Game Pass offers and cape codes, so confirm that the listing includes a permanent Microsoft account with full email access. Standard account protection lasts 5 days after the order is marked received. Eligible offers have paid 3- or 6-month warranty extensions. The published buyer payment fee is 8% + $0.30. Payment options depend on country, currency, and device; delivery can be instant or manual.",
      },
    },
  },
  {
    slug: "g2g",
    name: "G2G",
    logo: "/accounts/g2g.png",
    url: "https://www.g2g.com/categories/minecraft-account",
    websiteUrl: "https://www.g2g.com",
    trustpilotUrl: "https://www.trustpilot.com/review/www.g2g.com",
    paymentMethods: [
      "Card",
      "PayPal",
      "Apple Pay",
      "Google Pay",
      "Crypto",
      "Skrill",
      "Payoneer",
      "Bank Transfer",
      "Local methods",
    ],
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/g2g_global/" },
      { platform: "facebook", url: "https://www.facebook.com/G2Gdotcom" },
      { platform: "x", url: "https://x.com/G2Gdotcom" },
    ],
    startDate: "2013",
    listings: {
      "mfa-accounts": {
        summary:
          "Marketplace with full-access Microsoft Java and Bedrock accounts, Hypixel ranks, server progress, and capes. Seller ratings, delivery estimates, and account details vary by offer. GamerProtect provides a 14-day insurance period for game accounts.",
        badges: ["replacement-warranty"],
        price: "Varies by seller",
        priceDetails:
          "Compare full-access Microsoft account offers rather than the category's lowest advertised price, which can include offline accounts or other products. Check permanent ownership, full email access, edition, and server status in the individual listing. GamerProtect covers eligible account issues for 14 days from delivery, with a refund or replacement depending on the case. Report problems before confirming receipt. Delivery times and payment fees vary by seller and payment method; local payment availability depends on currency and region.",
      },
    },
  },
  {
    slug: "gameboost",
    name: "GameBoost",
    logo: "/accounts/gameboost.png",
    url: "https://gameboost.com/minecraft/accounts",
    websiteUrl: "https://gameboost.com",
    discordUrl: "https://discord.gg/gameboost",
    trustpilotUrl: "https://www.trustpilot.com/review/gameboost.com",
    paymentMethods: [
      "Card",
      "Apple Pay",
      "Google Pay",
      "Klarna",
      "Bank Transfer",
      "Paysafecard",
      "Crypto",
      "Skrill",
      "Neteller",
    ],
    socialLinks: [
      {
        platform: "facebook",
        url: "https://www.facebook.com/GlobalGamingServices",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/official.gameboost/",
      },
      { platform: "x", url: "https://x.com/GameBoostCom" },
      {
        platform: "youtube",
        url: "https://www.youtube.com/@GameBoostOfficial",
      },
      { platform: "tiktok", url: "https://www.tiktok.com/@official.gameboost" },
      { platform: "email", url: "mailto:support@gameboost.com" },
    ],
    listings: {
      "mfa-accounts": {
        summary:
          "Marketplace for full-access Java and Bedrock accounts, Hypixel ranks, Bedwars and Skyblock profiles, and capes. Offers seller chat, 24/7 support, and a free 14-day account warranty. Instant and manual delivery options depend on the listing.",
        badges: ["replacement-warranty"],
        price: "Varies by seller",
        priceDetails:
          "Prices vary by seller, account features, and display currency. The category also includes Game Pass access, cape codes, and name-only offers, so confirm that the product includes the permanent account and email access you need. Accounts include a free 14-day warranty; lifetime coverage is an optional paid upgrade. Contact the seller first, then open a support ticket for unresolved problems. Refunds can use store credit or the original payment method under the warranty policy. Payment fees and regional availability can affect checkout.",
      },
    },
  },
];

export function getShopBySlug(slug: string): Shop | undefined {
  return SHOPS.find((shop) => shop.slug === slug);
}

export const PROVIDERS: Provider[] = (
  ["nfa-accounts", "mfa-accounts"] as const
).flatMap((category) =>
  SHOPS.flatMap((shop) => {
    const listing = shop.listings[category];
    if (!listing) return [];
    return [
      {
        slug: shop.slug,
        name: shop.name,
        logo: shop.logo,
        logoUnoptimized: shop.logoUnoptimized,
        theme: shop.theme,
        url: shop.url,
        websiteUrl: shop.websiteUrl,
        discordUrl: shop.discordUrl,
        trustpilotUrl: shop.trustpilotUrl,
        socialLinks: shop.socialLinks,
        paymentMethods: shop.paymentMethods,
        startDate: shop.startDate,
        gallery: shop.gallery,
        promotedUntil: shop.promotedUntil,
        category,
        ...listing,
      },
    ];
  }),
);

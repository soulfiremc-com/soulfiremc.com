import type { MessageKey } from "@/lib/messages";
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
  summary: MessageKey;
  badges: Badge[];
  price: string;
  // USD catalog price, when a comparable account price is available.
  priceValue?: number;
  couponCode?: string;
  couponDiscount?: MessageKey;
  linkDiscountMessage?: MessageKey;
  priceDetails?: MessageKey;
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
  gallery?: { src: string; alt: MessageKey }[];
  promotedUntil?: string;
  listings: Partial<Record<Category, Listing>>;
};

export type Provider = {
  slug: string;
  name: string;
  logo?: string;
  logoUnoptimized?: boolean;
  theme?: ProviderThemeName;
  summary: MessageKey;
  url: string;
  websiteUrl?: string;
  discordUrl?: string;
  trustpilotUrl?: string;
  socialLinks?: SocialLink[];
  paymentMethods?: string[];
  startDate?: string;
  gallery?: { src: string; alt: MessageKey }[];
  promotedUntil?: string;
  badges: Badge[];
  category: Category;
  price: string;
  priceValue?: number;
  couponCode?: string;
  couponDiscount?: MessageKey;
  linkDiscountMessage?: MessageKey;
  priceDetails?: MessageKey;
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
    label: MessageKey;
    className: string;
    description: MessageKey;
    icon: React.ReactNode;
  }
> = {
  free: {
    label: "common.free",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description: "providers.accounts.badges.free.description",
    icon: <Gift className="h-3 w-3" />,
  },
  "high-quality": {
    label: "providers.badges.high-quality.label",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description: "providers.accounts.badges.high-quality.description",
    icon: <Star className="h-3 w-3" />,
  },
  "instant-delivery": {
    label: "providers.badges.instant-delivery.label",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    description: "providers.accounts.badges.instant-delivery.description",
    icon: <Zap className="h-3 w-3" />,
  },
  "replacement-warranty": {
    label: "providers.badges.replacement-warranty.label",
    className: "bg-success/10 text-success",
    description: "providers.accounts.badges.replacement-warranty.description",
    icon: <Shield className="h-3 w-3" />,
  },
  "lifetime-warranty": {
    label: "providers.badges.lifetime-warranty.label",
    className: "bg-success/10 text-success",
    description: "providers.accounts.badges.lifetime-warranty.description",
    icon: <Shield className="h-3 w-3" />,
  },
  "12h-warranty": {
    label: "providers.badges.12h-warranty.label",
    className: "bg-yellow-500/10 text-warning dark:text-yellow-400",
    description: "providers.accounts.badges.12h-warranty.description",
    icon: <Shield className="h-3 w-3" />,
  },
  "bulk-discount": {
    label: "providers.badges.bulk-discount.label",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description: "providers.accounts.badges.bulk-discount.description",
    icon: <Package className="h-3 w-3" />,
  },
  "official-integration": {
    label: "providers.badges.official-integration.label",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description: "providers.accounts.badges.official-integration.description",
    icon: <Plug className="h-3 w-3" />,
  },
  partner: {
    label: "providers.badges.partner.label",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    description: "providers.accounts.badges.partner.description",
    icon: <Heart className="h-3 w-3 fill-current" />,
  },
  affiliate: {
    label: "providers.badges.affiliate.label",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    description: "providers.accounts.badges.affiliate.description",
    icon: <Handshake className="h-3 w-3" />,
  },
};

export const CATEGORY_CONFIG: Record<
  Category,
  { label: MessageKey; description: MessageKey }
> = {
  "nfa-accounts": {
    label: "providers.accounts.categories.nfa-accounts.label",
    description: "providers.accounts.categories.nfa-accounts.description",
  },
  "mfa-accounts": {
    label: "providers.accounts.categories.mfa-accounts.label",
    description: "providers.accounts.categories.mfa-accounts.description",
  },
};

export const SORT_CONFIG: Record<
  SortOption,
  { label: MessageKey; icon?: React.ReactNode }
> = {
  default: {
    label: "providers.sort.default",
    icon: <Star className="h-3 w-3" />,
  },
  "best-rated": {
    label: "providers.sort.best-rated",
    icon: <Star className="h-3 w-3 fill-current" />,
  },
  "price-asc": {
    label: "providers.sort.price-asc",
    icon: <ArrowUpNarrowWide className="h-3 w-3" />,
  },
  "price-desc": {
    label: "providers.sort.price-desc",
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
        summary: "providers.accounts.ravealts.nfa.summary",
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
        couponDiscount: "offers.tenPercentOff",
        priceDetails: "providers.accounts.ravealts.nfa.priceDetails",
      },
      "mfa-accounts": {
        summary: "providers.accounts.ravealts.mfa.summary",
        badges: [
          "affiliate",
          "official-integration",
          "high-quality",
          "lifetime-warranty",
        ],
        price: "$5.67",
        priceValue: 5.67,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.tenPercentOff",
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
        summary: "providers.accounts.fernan.nfa.summary",
        badges: ["affiliate", "instant-delivery"],
        price: "5¢+",
        priceValue: 0.05,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.tenPercentOff",
        priceDetails: "providers.accounts.fernan.nfa.priceDetails",
      },
      "mfa-accounts": {
        summary: "providers.accounts.fernan.mfa.summary",
        badges: ["affiliate", "instant-delivery"],
        price: "$4.00+",
        priceValue: 4,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.tenPercentOff",
        priceDetails: "providers.accounts.fernan.mfa.priceDetails",
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
        summary: "providers.accounts.atomic-nfas.nfa.summary",
        badges: ["instant-delivery", "bulk-discount"],
        price: "providers.accounts.atomic-nfas.nfa.price",
        priceValue: 0.008,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.tenPercentOff",
        priceDetails: "providers.accounts.atomic-nfas.nfa.priceDetails",
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
        summary: "providers.accounts.luma-mfa.mfa.summary",
        badges: ["high-quality", "instant-delivery", "12h-warranty"],
        price: "$5.00",
        priceValue: 4.5,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.fivePercentOff",
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
        summary: "providers.accounts.nicealts.nfa.summary",
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
        summary: "providers.accounts.aqua-mfa.mfa.summary",
        badges: ["high-quality", "instant-delivery", "lifetime-warranty"],
        price: "$4.00-$5.50",
        priceValue: 4.0,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.fivePercentOff",
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
        summary: "providers.accounts.4d4p-shop.mfa.summary",
        badges: ["high-quality", "instant-delivery", "lifetime-warranty"],
        price: "$7.50+",
        priceValue: 7.5,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.fivePercentOff",
        priceDetails: "providers.accounts.4d4p-shop.mfa.priceDetails",
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
        summary: "providers.accounts.alts-fast.mfa.summary",
        badges: ["affiliate", "high-quality", "instant-delivery"],
        price: "$7.99+",
        priceValue: 7.99,
        linkDiscountMessage:
          "providers.accounts.alts-fast.mfa.linkDiscountMessage",
        priceDetails: "providers.accounts.alts-fast.mfa.priceDetails",
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
        summary: "providers.accounts.zzxgp.nfa.summary",
        badges: ["instant-delivery"],
        price: "providers.accounts.zzxgp.nfa.price",
        priceValue: 0.01,
        priceDetails: "providers.accounts.zzxgp.nfa.priceDetails",
      },
      "mfa-accounts": {
        summary: "providers.accounts.zzxgp.mfa.summary",
        badges: ["instant-delivery"],
        price: "$4.50",
        priceValue: 4.5,
        priceDetails: "providers.accounts.zzxgp.mfa.priceDetails",
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
        summary: "providers.accounts.yyy.nfa.summary",
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
        summary: "providers.accounts.mog-alts.nfa.summary",
        badges: ["instant-delivery", "bulk-discount"],
        price: "providers.accounts.mog-alts.nfa.price",
        priceValue: 0.008,
        priceDetails: "providers.accounts.mog-alts.nfa.priceDetails",
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
        summary: "providers.accounts.localts.nfa.summary",
        badges: ["partner", "affiliate", "high-quality", "instant-delivery"],
        price: "12-16¢",
        priceValue: 0.12,
        linkDiscountMessage:
          "providers.accounts.localts.nfa.linkDiscountMessage",
        priceDetails: "providers.accounts.localts.nfa.priceDetails",
      },
      "mfa-accounts": {
        summary: "providers.accounts.localts.mfa.summary",
        badges: ["partner", "affiliate", "high-quality", "instant-delivery"],
        price: "$5.99+",
        priceValue: 5.99,
        linkDiscountMessage:
          "providers.accounts.localts.nfa.linkDiscountMessage",
        priceDetails: "providers.accounts.localts.mfa.priceDetails",
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
        summary: "providers.accounts.skycron.nfa.summary",
        badges: ["instant-delivery"],
        price: "common.subscription",
        priceValue: 0,
        couponCode: "SOULFIRE",
        couponDiscount: "offers.fivePercentOff",
        priceDetails: "providers.accounts.skycron.nfa.priceDetails",
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
        summary: "providers.accounts.lunaralts.nfa.summary",
        badges: ["high-quality", "instant-delivery"],
        price: "2-10¢",
        priceValue: 0.02,
        priceDetails: "providers.accounts.lunaralts.nfa.priceDetails",
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
        summary: "providers.accounts.kynoselling.nfa.summary",
        badges: [
          "affiliate",
          "instant-delivery",
          "high-quality",
          "replacement-warranty",
        ],
        price: "8¢",
        priceValue: 0.08,
        couponCode: "SOULFIRE10",
        couponDiscount: "offers.tenPercentOff",
        priceDetails: "providers.accounts.kynoselling.nfa.priceDetails",
      },
      "mfa-accounts": {
        summary: "providers.accounts.kynoselling.mfa.summary",
        badges: [
          "affiliate",
          "instant-delivery",
          "high-quality",
          "replacement-warranty",
        ],
        price: "$5.99",
        priceValue: 5.99,
        couponCode: "SOULFIRE10",
        couponDiscount: "offers.tenPercentOff",
        priceDetails: "providers.accounts.kynoselling.nfa.priceDetails",
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
        summary: "providers.accounts.altsgreat.mfa.summary",
        badges: [],
        price: "$6.99+",
        priceValue: 6.99,
        priceDetails: "providers.accounts.altsgreat.mfa.priceDetails",
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
        summary: "providers.accounts.fastalts.mfa.summary",
        badges: ["instant-delivery", "replacement-warranty"],
        price: "$18.99+",
        priceValue: 18.99,
        priceDetails: "providers.accounts.fastalts.mfa.priceDetails",
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
        summary: "providers.accounts.eldorado.mfa.summary",
        badges: [],
        price: "common.variesBySeller",
        priceDetails: "providers.accounts.eldorado.mfa.priceDetails",
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
        summary: "providers.accounts.g2g.mfa.summary",
        badges: ["replacement-warranty"],
        price: "common.variesBySeller",
        priceDetails: "providers.accounts.g2g.mfa.priceDetails",
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
        summary: "providers.accounts.gameboost.mfa.summary",
        badges: ["replacement-warranty"],
        price: "common.variesBySeller",
        priceDetails: "providers.accounts.gameboost.mfa.priceDetails",
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

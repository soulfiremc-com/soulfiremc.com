import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Gift,
  Handshake,
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
  | "lifetime-warranty"
  | "12h-warranty"
  | "bulk-discount";

export type Badge = FilterableBadge | "official-integration" | "affiliate";

export type ProviderTheme = {
  ring: string;
  bg: string;
  badge: string;
  logo: string;
  panel: string;
  price: string;
  primaryButton: string;
  secondaryButton: string;
  accentText: string;
};

export type Category = "nfa-accounts" | "mfa-accounts";

export type SortOption = "default" | "best-rated" | "price-asc" | "price-desc";

export type Listing = {
  summary: string;
  badges: Badge[];
  price: string;
  priceValue: number;
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
  theme?: string;
  url: string;
  websiteUrl?: string;
  discordUrl?: string;
  trustpilotUrl?: string;
  socialLinks?: SocialLink[];
  paymentMethods?: string[];
  startDate?: string;
  gallery?: { src: string; alt: string }[];
  listings: Partial<Record<Category, Listing>>;
};

export type Provider = {
  slug: string;
  name: string;
  logo?: string;
  logoUnoptimized?: boolean;
  theme?: string;
  summary: string;
  url: string;
  websiteUrl?: string;
  discordUrl?: string;
  trustpilotUrl?: string;
  socialLinks?: SocialLink[];
  paymentMethods?: string[];
  startDate?: string;
  gallery?: { src: string; alt: string }[];
  badges: Badge[];
  category: Category;
  price: string;
  priceValue: number;
  couponCode?: string;
  couponDiscount?: string;
  linkDiscountMessage?: string;
  priceDetails?: string;
};

export function getDiscordInviteUrl(
  provider: Pick<Provider, "discordUrl" | "url">,
): string | null {
  const discordLink = provider.discordUrl ?? provider.url;
  return /(discord\.gg|discord\.com\/invite)/i.test(discordLink) ||
    provider.discordUrl
    ? discordLink
    : null;
}

export const PROVIDER_THEMES: Record<string, ProviderTheme> = {
  rave: {
    ring: "ring-rose-500/35 dark:ring-rose-400/25",
    bg: "border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-background to-orange-500/10 dark:from-rose-500/15 dark:via-card dark:to-orange-500/10",
    badge:
      "border border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
    logo: "ring-2 ring-rose-500/25 bg-white/85 shadow-[0_14px_40px_-24px_rgba(244,63,94,0.9)] dark:bg-white/8",
    panel: "border-rose-500/15 bg-white/70 backdrop-blur-sm dark:bg-white/5",
    price:
      "border border-rose-500/20 bg-white/85 text-rose-700 shadow-sm shadow-rose-500/10 dark:bg-white/10 dark:text-rose-200",
    primaryButton:
      "bg-rose-600 text-white shadow-sm shadow-rose-500/30 hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400",
    secondaryButton:
      "border border-rose-500/15 bg-white/75 text-rose-700 hover:bg-rose-500/10 dark:bg-white/8 dark:text-rose-200 dark:hover:bg-white/12",
    accentText: "text-rose-700 dark:text-rose-200",
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
  "lifetime-warranty": {
    label: "Lifetime Warranty",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
    description:
      "Accounts come with lifetime warranty - get a replacement if your account stops working.",
    icon: <Shield className="h-3 w-3" />,
  },
  "12h-warranty": {
    label: "Fair Warranty",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
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
    theme: "rave",
    url: "https://dash.ravealts.com",
    websiteUrl: "https://ravealts.com",
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
    slug: "luma-mfa",
    name: "Luma MFA",
    logo: "/accounts/luma.png",
    url: "https://discord.gg/5Wc4tA2ypY",
    paymentMethods: ["Discord checkout"],
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
  // {
  //   slug: "mori",
  //   name: "mori's alternative world",
  //   logo: "/accounts/mori.png",
  //   url: "https://discord.gg/logs",
  //   startDate: "Dec 2025",
  //   gallery: [
  //     {
  //       src: "/accounts/gallery/mori-account-listing.png",
  //       alt: "Account listing with Hypixel, DonutSMP and CubeCraft status checks",
  //     },
  //     {
  //       src: "/accounts/gallery/mori-statistics.png",
  //       alt: "Statistics showing 489+ alternatives, 174 Hypixel unbanned and 281 premium users",
  //     },
  //     {
  //       src: "/accounts/gallery/mori-growth.png",
  //       alt: "Discord growth chart showing steady member joins since launch",
  //     },
  //   ],
  //   listings: {
  //     "nfa-accounts": {
  //       summary:
  //         "Free accounts with Hypixel, DonutSMP and CubeCraft status checks. Premium tier also free. Nothing is sold, runs on occasional Linkvertise links. Up to 75 accounts per day with hourly restocks.",
  //       badges: ["free", "instant-delivery"],
  //       price: "Free",
  //       priceValue: 0,
  //       priceDetails:
  //         "Grab accounts from #alternatives for free. Optional premium channel (also free via a short Linkvertise link) gives 24h access to Hypixel ranked accounts and DonutSMP accounts with extra money/playtime.",
  //     },
  //   },
  // },
  {
    slug: "nicealts",
    name: "Nicealts",
    logo: "/accounts/nicealts.png",
    url: "https://nicealts.com",
    websiteUrl: "https://nicealts.com",
    discordUrl: "https://discord.gg/QdFhNQ5rcv",
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
          "Cheap MFA accounts with instant delivery, lifetime warranty, and over 400 accounts sold.",
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
    startDate: "2019",
    listings: {
      "mfa-accounts": {
        summary:
          "Full-access Minecraft account store operating since 2019 with Hypixel and DonutSMP unbanned accounts, Hypixel ranked accounts, rare cape accounts, and 4-letter usernames. Public feedback shows 600+ customer reviews, and orders advertise instant automated delivery plus lifetime warranty.",
        badges: [
          "affiliate",
          "high-quality",
          "instant-delivery",
          "lifetime-warranty",
        ],
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
    logo: "/accounts/localts.png",
    url: "https://localts.store/?campaign=soulfire",
    websiteUrl: "https://localts.info",
    discordUrl: "https://invite.localts.store",
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
        badges: ["affiliate", "high-quality", "instant-delivery"],
        price: "25¢+",
        priceValue: 0.25,
        linkDiscountMessage:
          "Register using the link below for a 5% discount on checkout",
        priceDetails:
          "Current public store starts at 25¢ for Hypixel Level 1-9 and Gamepass NFAs, then 40¢ for Level 10+, 55¢ for Bedwars 8+, 67¢ for Level 21+, 70¢ for random rank, $3.50 for MVP+, and $4.50 for Level 70+. Terms advertise replacements within 24 hours.",
      },
      "mfa-accounts": {
        summary:
          "Full-access accounts with instant delivery, 7+ day age, and OTP secret included. Ranked variants are available above the base tier.",
        badges: ["affiliate", "high-quality", "instant-delivery"],
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
    paymentMethods: ["Checkout varies"],
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
  // {
  //   slug: "brano",
  //   name: "Brano",
  //   logo: "/accounts/brano.png",
  //   url: "https://discord.gg/EsbhHkm9e4",
  //   listings: {
  //     "mfa-accounts": {
  //       summary:
  //         "OG usernames, Minecon capes, and rare collectible accounts. Premium pricing for exclusive items.",
  //       badges: ["high-quality", "lifetime-warranty"],
  //       price: "$50.00+",
  //       priceValue: 50.0,
  //     },
  //   },
  // },
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
        category,
        ...listing,
      },
    ];
  }),
);

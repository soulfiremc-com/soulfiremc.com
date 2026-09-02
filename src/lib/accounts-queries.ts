import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  getDiscordInviteUrl,
  getShopBySlug,
  PROVIDERS,
} from "@/lib/accounts-data";
import { getLiveShopData } from "@/lib/accounts-offers";
import { type DiscordInviteResponse, fetchDiscordInvite } from "@/lib/discord";
import type { ReviewSummary } from "@/lib/review-core";
import { getReviewSummaries } from "@/lib/reviews";

const accountProvidersBySlug = [
  ...new Map(PROVIDERS.map((provider) => [provider.slug, provider])).values(),
];
const accountProviderSlugs = accountProvidersBySlug.map(
  (provider) => provider.slug,
);

export type DiscordInvites = Record<string, DiscordInviteResponse | null>;

export type LiveShopDataBySlug = Record<
  string,
  Awaited<ReturnType<typeof getLiveShopData>>
>;

const getAccountReviewSummaries = createServerFn({ method: "GET" }).handler(
  () =>
    getReviewSummaries("account", accountProviderSlugs).catch(
      () => ({}) as Record<string, ReviewSummary>,
    ),
);

const getAccountLiveShopData = createServerFn({ method: "GET" }).handler(
  async () => {
    const entries = await Promise.all(
      accountProvidersBySlug.map(async (provider) => {
        const shop = getShopBySlug(provider.slug);
        if (!shop) return [provider.slug, {}] as const;

        return [
          provider.slug,
          await getLiveShopData(shop).catch(() => ({})),
        ] as const;
      }),
    );

    return Object.fromEntries(entries) as LiveShopDataBySlug;
  },
);

const getAccountDiscordInvites = createServerFn({ method: "GET" }).handler(
  async () =>
    Object.fromEntries(
      await Promise.all(
        accountProvidersBySlug.map(async (provider) => {
          const discordInviteUrl = getDiscordInviteUrl(provider);
          return [
            provider.slug,
            discordInviteUrl
              ? await fetchDiscordInvite(discordInviteUrl).catch(() => null)
              : null,
          ] as const;
        }),
      ),
    ) as DiscordInvites,
);

export const accountReviewSummariesQueryOptions = queryOptions({
  queryKey: ["accounts", "review-summaries"],
  queryFn: () => getAccountReviewSummaries(),
  staleTime: 60_000,
});

export const accountLiveShopDataQueryOptions = queryOptions({
  queryKey: ["accounts", "live-shop-data"],
  queryFn: () => getAccountLiveShopData(),
  staleTime: 60_000,
});

export const accountsDiscordInvitesQueryOptions = queryOptions({
  queryKey: ["accounts", "discord-invites"],
  queryFn: () => getAccountDiscordInvites(),
  staleTime: 10 * 60_000,
});

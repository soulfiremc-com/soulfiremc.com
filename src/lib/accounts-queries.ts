import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  getDiscordInviteUrl,
  getShopBySlug,
  PROVIDERS,
} from "@/lib/accounts-data";
import { getLiveShopData } from "@/lib/accounts-offers";
import { type DiscordInviteResponse, fetchDiscordInvite } from "@/lib/discord";

const accountProvidersBySlug = [
  ...new Map(PROVIDERS.map((provider) => [provider.slug, provider])).values(),
];
export type DiscordInvites = Record<string, DiscordInviteResponse | null>;

export type LiveShopDataBySlug = Record<
  string,
  Awaited<ReturnType<typeof getLiveShopData>>
>;

const getAllAccountLiveShopData = createServerFn({ method: "GET" }).handler(
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

const getAccountLiveShopData = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const shop = getShopBySlug(slug);
    return shop ? getLiveShopData(shop).catch(() => ({})) : {};
  });

const getAccountDiscordInvite = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const shop = getShopBySlug(slug);
    const discordInviteUrl = shop ? getDiscordInviteUrl(shop) : null;
    return discordInviteUrl
      ? fetchDiscordInvite(discordInviteUrl).catch(() => null)
      : null;
  });

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

export function accountLiveShopDataQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["accounts", slug, "live-shop-data"],
    queryFn: () => getAccountLiveShopData({ data: slug }),
    staleTime: 60_000,
  });
}

export const allAccountLiveShopDataQueryOptions = queryOptions({
  queryKey: ["accounts", "live-shop-data"],
  queryFn: () => getAllAccountLiveShopData(),
  staleTime: 60_000,
});

export function accountDiscordInviteQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["accounts", slug, "discord-invite"],
    queryFn: () => getAccountDiscordInvite({ data: slug }),
    staleTime: 10 * 60_000,
  });
}

export const accountsDiscordInvitesQueryOptions = queryOptions({
  queryKey: ["accounts", "discord-invites"],
  queryFn: () => getAccountDiscordInvites(),
  staleTime: 10 * 60_000,
});

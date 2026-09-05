import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getDiscordInviteUrl, getShopBySlug, SHOPS } from "@/lib/accounts-data";
import { getLiveShopData } from "@/lib/accounts-offers";
import { type DiscordInviteResponse, fetchDiscordInvite } from "@/lib/discord";

export type DiscordInvites = Record<string, DiscordInviteResponse | null>;

export type LiveShopDataBySlug = Record<
  string,
  Awaited<ReturnType<typeof getLiveShopData>>
>;

const getAllAccountLiveShopData = createServerFn({ method: "GET" }).handler(
  async () => {
    const entries = await Promise.all(
      SHOPS.map(
        async (shop) => [shop.slug, await getLiveShopData(shop)] as const,
      ),
    );

    return Object.fromEntries(entries) as LiveShopDataBySlug;
  },
);

const getAccountLiveShopData = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const shop = getShopBySlug(slug);
    return shop ? getLiveShopData(shop) : {};
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
        SHOPS.map(async (provider) => {
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

import { Context, Effect } from "effect";
import {
  getDiscordInviteUrl,
  getShopBySlug,
  SHOPS,
  type Shop,
} from "@/lib/accounts-data";
import {
  getLiveShopDataEffect,
  type LiveShopData,
} from "@/lib/accounts-offers";
import {
  fetchDiscordInviteEffect,
  type DiscordInviteResponse,
} from "@/lib/discord";

export type DiscordInvites = Record<string, DiscordInviteResponse | null>;
export type LiveShopDataBySlug = Record<string, LiveShopData>;

export class AccountProviderSources extends Context.Service<
  AccountProviderSources,
  {
    readonly stock: (shop: Shop) => Effect.Effect<LiveShopData>;
    readonly invite: (
      url: string,
    ) => Effect.Effect<DiscordInviteResponse | null>;
  }
>()("soulfire/AccountProviderSources") {}

export const accountProviderSources: Context.Service.Shape<
  typeof AccountProviderSources
> = {
  stock: getLiveShopDataEffect,
  invite: (url) =>
    fetchDiscordInviteEffect(url).pipe(Effect.orElseSucceed(() => null)),
};

export const loadAllAccountStock = Effect.fn("Providers.allStock")(
  function* () {
    const sources = yield* AccountProviderSources;
    const entries = yield* Effect.forEach(
      SHOPS,
      (shop) =>
        sources
          .stock(shop)
          .pipe(Effect.map((stock) => [shop.slug, stock] as const)),
      { concurrency: 4 },
    );
    return Object.fromEntries(entries) as LiveShopDataBySlug;
  },
);

export const loadAccountStock = Effect.fn("Providers.stock")(function* (
  slug: string,
) {
  const sources = yield* AccountProviderSources;
  const shop = getShopBySlug(slug);
  return shop ? yield* sources.stock(shop) : {};
});

export const loadAccountInvite = Effect.fn("Providers.invite")(function* (
  slug: string,
) {
  const sources = yield* AccountProviderSources;
  const shop = getShopBySlug(slug);
  const url = shop ? getDiscordInviteUrl(shop) : null;
  return url ? yield* sources.invite(url) : null;
});

export const loadAllAccountInvites = Effect.fn("Providers.allInvites")(
  function* () {
    const entries = yield* Effect.forEach(
      SHOPS,
      (shop) =>
        loadAccountInvite(shop.slug).pipe(
          Effect.map((invite) => [shop.slug, invite] as const),
        ),
      { concurrency: 4 },
    );
    return Object.fromEntries(entries) as DiscordInvites;
  },
);

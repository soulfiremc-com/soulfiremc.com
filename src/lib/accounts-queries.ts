import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { runWebsiteEffect } from "@/lib/effect-runtime";
import {
  AccountProviderSources,
  accountProviderSources,
  loadAccountInvite,
  loadAccountStock,
  loadAllAccountInvites,
  loadAllAccountStock,
} from "@/lib/account-provider-workflows";
export type {
  DiscordInvites,
  LiveShopDataBySlug,
} from "@/lib/account-provider-workflows";

function runProviders<A, E>(
  program: Effect.Effect<A, E, AccountProviderSources>,
) {
  return runWebsiteEffect(
    program.pipe(
      Effect.provideService(AccountProviderSources, accountProviderSources),
    ),
    getRequest().signal,
  );
}

const getAllAccountLiveShopData = createServerFn({ method: "GET" }).handler(
  () => runProviders(loadAllAccountStock()),
);
const getAccountLiveShopData = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(({ data }) => runProviders(loadAccountStock(data)));
const getAccountDiscordInvite = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(({ data }) => runProviders(loadAccountInvite(data)));
const getAccountDiscordInvites = createServerFn({ method: "GET" }).handler(() =>
  runProviders(loadAllAccountInvites()),
);

export function accountLiveShopDataQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["accounts", slug, "live-shop-data"],
    queryFn: ({ signal }) => getAccountLiveShopData({ data: slug, signal }),
    staleTime: 60_000,
  });
}

export const allAccountLiveShopDataQueryOptions = queryOptions({
  queryKey: ["accounts", "live-shop-data"],
  queryFn: ({ signal }) => getAllAccountLiveShopData({ signal }),
  staleTime: 60_000,
});

export function accountDiscordInviteQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["accounts", slug, "discord-invite"],
    queryFn: ({ signal }) => getAccountDiscordInvite({ data: slug, signal }),
    staleTime: 10 * 60_000,
  });
}

export const accountsDiscordInvitesQueryOptions = queryOptions({
  queryKey: ["accounts", "discord-invites"],
  queryFn: ({ signal }) => getAccountDiscordInvites({ signal }),
  staleTime: 10 * 60_000,
});

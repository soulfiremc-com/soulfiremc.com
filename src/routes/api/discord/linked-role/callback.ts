import { createFileRoute } from "@tanstack/react-router";
import { deleteCookie, getCookie } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { Data, Effect } from "effect";
import { db } from "@/lib/db";
import { account, user } from "@/lib/db/auth-schema";
import {
  checkLinkedRoleCallback,
  getLinkedRoleResultUrl,
  type LinkedRoleStatus,
} from "@/lib/discord-linked-role";
import {
  exchangeDiscordCodeEffect,
  getDiscordUserEffect,
  pushLinkedRoleMetadataEffect,
} from "@/lib/discord";
import { runWebsiteEffect } from "@/lib/effect-runtime";

const REDIRECT_URI = "https://soulfiremc.com/api/discord/linked-role/callback";

class DiscordAccountLookupError extends Data.TaggedError(
  "DiscordAccountLookupError",
)<{
  readonly cause: unknown;
}> {}

export const Route = createFileRoute("/api/discord/linked-role/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const check = checkLinkedRoleCallback(
          new URL(request.url).searchParams,
          getCookie("discord_oauth_state"),
        );
        deleteCookie("discord_oauth_state", { path: "/" });
        const showResult = (status: LinkedRoleStatus) =>
          Response.redirect(getLinkedRoleResultUrl(status, request.url));

        if ("status" in check) return showResult(check.status);
        const { code } = check;

        return runWebsiteEffect(
          Effect.gen(function* () {
            const tokens = yield* exchangeDiscordCodeEffect(code, REDIRECT_URI);
            const discordUser = yield* getDiscordUserEffect(
              tokens.access_token,
            );

            const sfAccount = yield* Effect.tryPromise({
              try: () =>
                db
                  .select({
                    userId: account.userId,
                    userName: user.name,
                    emailVerified: user.emailVerified,
                    createdAt: user.createdAt,
                  })
                  .from(account)
                  .innerJoin(user, eq(account.userId, user.id))
                  .where(
                    and(
                      eq(account.providerId, "discord"),
                      eq(account.accountId, discordUser.id),
                    ),
                  )
                  .limit(1),
              catch: (cause) => new DiscordAccountLookupError({ cause }),
            });

            const sfUser = sfAccount[0];

            if (sfUser) {
              yield* pushLinkedRoleMetadataEffect(tokens.access_token, {
                platform_name: "SoulFire",
                platform_username: sfUser.userName,
                metadata: {
                  verified_account: 1,
                  email_verified: sfUser.emailVerified ? 1 : 0,
                  account_created: sfUser.createdAt.toISOString(),
                },
              });
            } else {
              yield* pushLinkedRoleMetadataEffect(tokens.access_token, {
                platform_name: "SoulFire",
                platform_username: null,
                metadata: {
                  verified_account: 0,
                  email_verified: 0,
                  account_created: new Date().toISOString(),
                },
              });
            }

            return showResult(sfUser ? "linked" : "accountNotFound");
          }).pipe(
            Effect.catch((error) =>
              Effect.logError("Discord linked role update failed", error).pipe(
                Effect.as(showResult("failed")),
              ),
            ),
          ),
          request.signal,
        );
      },
    },
  },
});

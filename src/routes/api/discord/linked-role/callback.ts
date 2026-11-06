import { createFileRoute } from "@tanstack/react-router";
import { deleteCookie, getCookie } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, user } from "@/lib/db/auth-schema";
import {
  exchangeDiscordCode,
  getDiscordUser,
  pushLinkedRoleMetadata,
} from "@/lib/discord";

const REDIRECT_URI = "https://soulfiremc.com/api/discord/linked-role/callback";

export const Route = createFileRoute("/api/discord/linked-role/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code || !state) {
          return Response.json(
            { error: "Missing code or state" },
            { status: 400 },
          );
        }

        const storedState = getCookie("discord_oauth_state");
        deleteCookie("discord_oauth_state", { path: "/" });

        if (state !== storedState) {
          return Response.json({ error: "Invalid state" }, { status: 403 });
        }

        const tokens = await exchangeDiscordCode(code, REDIRECT_URI);
        const discordUser = await getDiscordUser(tokens.access_token);

        const sfAccount = await db
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
          .limit(1);

        const sfUser = sfAccount[0];

        if (sfUser) {
          await pushLinkedRoleMetadata(tokens.access_token, {
            platform_name: "Soulfire",
            platform_username: sfUser.userName,
            metadata: {
              verified_account: 1,
              email_verified: sfUser.emailVerified ? 1 : 0,
              account_created: sfUser.createdAt.toISOString(),
            },
          });
        } else {
          await pushLinkedRoleMetadata(tokens.access_token, {
            platform_name: "Soulfire",
            platform_username: null,
            metadata: {
              verified_account: 0,
              email_verified: 0,
              account_created: new Date().toISOString(),
            },
          });
        }

        return Response.redirect("https://discord.com/");
      },
    },
  },
});

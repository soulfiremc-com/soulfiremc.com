import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";

export const Route = createFileRoute("/api/discord/linked-role/")({
  server: {
    handlers: {
      GET: () => {
        const state = crypto.randomUUID();

        setCookie("discord_oauth_state", state, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 300,
          path: "/",
        });

        const params = new URLSearchParams({
          client_id: process.env["DISCORD_CLIENT_ID"] ?? "",
          redirect_uri:
            "https://soulfiremc.com/api/discord/linked-role/callback",
          response_type: "code",
          scope: "identify role_connections.write",
          state,
        });

        return Response.redirect(
          `https://discord.com/oauth2/authorize?${params}`,
        );
      },
    },
  },
});

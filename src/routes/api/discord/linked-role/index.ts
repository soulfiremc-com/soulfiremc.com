import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { Effect } from "effect";
import {
  getLinkedRoleAuthorizeUrl,
  getLinkedRoleResultUrl,
} from "@/lib/discord-linked-role";
import { runWebsiteEffect } from "@/lib/effect-runtime";

// Response.redirect() has immutable headers, and TanStack Start must append
// the state cookie to this response.
function redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export const Route = createFileRoute("/api/discord/linked-role/")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const state = crypto.randomUUID();
        const authorizeUrl = getLinkedRoleAuthorizeUrl(
          process.env["DISCORD_CLIENT_ID"],
          state,
        );
        if (!authorizeUrl) {
          return runWebsiteEffect(
            Effect.logError(
              "Discord linked role start failed: DISCORD_CLIENT_ID is not set",
            ).pipe(
              Effect.as(
                redirect(getLinkedRoleResultUrl("failed", request.url)),
              ),
            ),
          );
        }

        setCookie("discord_oauth_state", state, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 300,
          path: "/",
        });
        return redirect(authorizeUrl);
      },
    },
  },
});

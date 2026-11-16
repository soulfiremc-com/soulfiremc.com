import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCwIcon, SettingsIcon } from "lucide-react";
import { HomeButton, StatusMessage } from "@/components/route-status-page";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import {
  isLinkedRoleStatus,
  LINKED_ROLE_START_PATH,
  type LinkedRoleStatus,
} from "@/lib/discord-linked-role";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";
import { useT } from "@/lib/i18n-react";
import type { MessageKey } from "@/lib/messages";

const statusMessages: Record<
  LinkedRoleStatus,
  { title: MessageKey; text: MessageKey }
> = {
  linked: {
    title: "discordLinkedRole.linked.title",
    text: "discordLinkedRole.linked.text",
  },
  accountNotFound: {
    title: "discordLinkedRole.accountNotFound.title",
    text: "discordLinkedRole.accountNotFound.text",
  },
  cancelled: {
    title: "discordLinkedRole.cancelled.title",
    text: "discordLinkedRole.cancelled.text",
  },
  expired: {
    title: "discordLinkedRole.expired.title",
    text: "discordLinkedRole.expired.text",
  },
  failed: {
    title: "discordLinkedRole.failed.title",
    text: "discordLinkedRole.failed.text",
  },
};

export const Route = createFileRoute("/discord_/linked-role")({
  validateSearch: (search): { status: LinkedRoleStatus } => ({
    status: isLinkedRoleStatus(search.status) ? search.status : "failed",
  }),
  head: () => ({
    meta: [
      { title: "Discord linked role - SoulFire" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LinkedRoleResultPage,
});

function LinkedRoleResultPage() {
  const t = useT();
  const { status } = Route.useSearch();
  const message = statusMessages[status];

  return (
    <SiteShell>
      <StatusMessage
        title={t(message.title)}
        text={t(message.text)}
        actions={
          status === "linked" ? (
            <>
              <Button
                nativeButton={false}
                render={
                  <a href="https://discord.com/app">
                    {t("discordLinkedRole.openDiscord")}
                  </a>
                }
              />
              <HomeButton variant="outline" />
            </>
          ) : status === "accountNotFound" ? (
            <>
              <Button
                nativeButton={false}
                render={
                  <Link
                    to="/account/$path"
                    params={{ path: AUTH_UI_VIEW_PATHS.settings.security }}
                  >
                    <SettingsIcon data-icon="inline-start" />
                    {t("discordLinkedRole.openAccountSettings")}
                  </Link>
                }
              />
              <TryAgainLink variant="outline" />
            </>
          ) : (
            <>
              <TryAgainLink variant="default" />
              <HomeButton variant="outline" />
            </>
          )
        }
      />
    </SiteShell>
  );
}

function TryAgainLink({ variant }: { variant: "default" | "outline" }) {
  const t = useT();
  return (
    <Button
      nativeButton={false}
      variant={variant}
      render={
        <a href={LINKED_ROLE_START_PATH}>
          <RotateCwIcon data-icon="inline-start" />
          {t("errors.tryAgain")}
        </a>
      }
    />
  );
}

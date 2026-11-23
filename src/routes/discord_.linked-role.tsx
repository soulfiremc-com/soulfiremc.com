import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoyIcon, RotateCwIcon, SettingsIcon } from "lucide-react";
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
import { type MessageKey, translate } from "@/lib/messages";

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
    status: isLinkedRoleStatus(search["status"]) ? search["status"] : "failed",
  }),
  // These pages have no locale prefix, so they render in English.
  head: ({ match }) => ({
    meta: [
      {
        title: `${translate("en", statusMessages[match.search.status].title)} - ${translate("en", "common.brand")}`,
      },
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
          ) : status === "failed" ? (
            <>
              <TryAgainLink variant="default" />
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <Link to="/discord">
                    <LifeBuoyIcon data-icon="inline-start" />
                    {t("discordLinkedRole.getHelp")}
                  </Link>
                }
              />
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

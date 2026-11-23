import { createFileRoute, redirect } from "@tanstack/react-router";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";

export const Route = createFileRoute("/account/")({
  beforeLoad() {
    throw redirect({
      to: "/account/$path",
      params: { path: AUTH_UI_VIEW_PATHS.settings.account },
    });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";

export const Route = createFileRoute("/admin/")({
  beforeLoad() {
    throw redirect({
      to: "/admin/$path",
      params: { path: AUTH_UI_VIEW_PATHS.admin.users },
    });
  },
});

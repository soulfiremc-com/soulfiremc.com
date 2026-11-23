import { createFileRoute, redirect } from "@tanstack/react-router";
import { AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";

export const Route = createFileRoute("/auth/")({
  beforeLoad({ location }) {
    throw redirect({
      to: "/auth/$path",
      params: { path: AUTH_UI_VIEW_PATHS.auth.signIn },
      search: location.search,
    });
  },
});

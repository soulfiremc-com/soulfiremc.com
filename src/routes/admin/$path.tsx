import { createFileRoute, notFound } from "@tanstack/react-router";
import { Admin } from "@/components/auth/admin/admin";
import { ADMIN_REVIEW_PATH, AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";

const validAdminPathSegments = new Set([
  AUTH_UI_VIEW_PATHS.admin.users,
  ADMIN_REVIEW_PATH,
]);

export const Route = createFileRoute("/admin/$path")({
  beforeLoad({ params: { path } }) {
    if (!validAdminPathSegments.has(path)) {
      throw notFound();
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const { path } = Route.useParams();

  return <Admin path={path} />;
}

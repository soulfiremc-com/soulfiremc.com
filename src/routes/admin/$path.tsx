import { createFileRoute, notFound } from "@tanstack/react-router";
import { Admin } from "@/components/auth/admin/admin";
import { ADMIN_REVIEW_PATH, AUTH_UI_VIEW_PATHS } from "@/lib/auth-ui-config";
import { type MessageKey, translate } from "@/lib/messages";

const validAdminPathSegments = new Set([
  AUTH_UI_VIEW_PATHS.admin.users,
  AUTH_UI_VIEW_PATHS.settings.activity,
  ADMIN_REVIEW_PATH,
]);

const sectionTitleKeys = new Map<string, MessageKey>([
  [AUTH_UI_VIEW_PATHS.admin.users, "authUi.admin.users"],
  [AUTH_UI_VIEW_PATHS.settings.activity, "authUi.dash.activity"],
  [ADMIN_REVIEW_PATH, "admin.reviews.tab"],
]);

export const Route = createFileRoute("/admin/$path")({
  beforeLoad({ params: { path } }) {
    if (!validAdminPathSegments.has(path)) {
      throw notFound();
    }
  },
  // Admin pages have no locale prefix, so they render in English.
  head: ({ params: { path } }) => {
    const sectionKey = sectionTitleKeys.get(path);
    const title = [
      sectionKey && translate("en", sectionKey),
      translate("en", "authUi.admin.admin"),
      translate("en", "common.brand"),
    ];
    return { meta: [{ title: title.filter(Boolean).join(" - ") }] };
  },
  component: AdminPage,
});

function AdminPage() {
  const { path } = Route.useParams();

  return <Admin path={path} />;
}

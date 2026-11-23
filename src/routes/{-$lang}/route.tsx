import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { isLocale, localizePath } from "@/lib/i18n";

export const Route = createFileRoute("/{-$lang}")({
  beforeLoad: ({ params, location }) => {
    if (params.lang && !isLocale(params.lang)) throw notFound();
    if (params.lang === "en") {
      // `pathname` and `hash` are decoded. A decoded non-ASCII character
      // cannot go in the Location header, and a decoded `%3F` or `%23` would
      // change the target, so keep the encoded `href`.
      throw redirect({
        href: localizePath(location.href, "en"),
        statusCode: 308,
      });
    }
  },
  component: Outlet,
});

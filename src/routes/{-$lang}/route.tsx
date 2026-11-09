import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { isLocale, splitLocalePath } from "@/lib/i18n";

export const Route = createFileRoute("/{-$lang}")({
  beforeLoad: ({ params, location }) => {
    if (params.lang && !isLocale(params.lang)) throw notFound();
    if (params.lang === "en") {
      throw redirect({
        href: `${splitLocalePath(location.pathname).path}${location.searchStr}${location.hash ? `#${location.hash}` : ""}`,
        statusCode: 308,
      });
    }
  },
  component: Outlet,
});

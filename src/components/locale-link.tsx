import { Link } from "@tanstack/react-router";
import { hrefPath, localizeHref } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n-react";

export function LocaleLink({
  href = "",
  prefetch = true,
  onClick,
  children,
  ...props
}: React.ComponentProps<"a"> & { prefetch?: boolean }) {
  const locale = useLocale();
  const to = localizeHref(href, locale);
  // The router resolves fragment-only and relative links against the route,
  // not the current URL, and drops their fragment. Let the browser handle them.
  if (!to.startsWith("/") || to.startsWith("//"))
    return (
      <a href={to} onClick={onClick} {...props}>
        {children}
      </a>
    );
  return (
    <Link
      // A `to` with `?` or `#` keeps them in the path, so the link would
      // preload and match a page that does not exist. The router builds the
      // location from `href`, which splits the search and hash.
      to={hrefPath(to)}
      href={to}
      preload={prefetch ? "intent" : false}
      onClick={(event) => {
        onClick?.(event);
        if (!isSamePageClick(event, to)) return;
        // The router restores the current scroll position on a same-URL
        // navigation, which cancels the scroll. Skip that no-op navigation.
        event.preventDefault();
        scrollToTop();
      }}
      {...props}
    >
      {children}
    </Link>
  );
}

/** A link to the current page navigates nowhere, so return to the top instead. */
function isSamePageClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  to: string,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !to.startsWith("/") ||
    to.includes("#")
  )
    return false;
  const target = new URL(to, window.location.href);
  return (
    target.pathname === window.location.pathname &&
    target.search === window.location.search
  );
}

function scrollToTop() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

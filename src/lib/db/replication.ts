const BOOKMARK_COOKIE = "soulfire-d1-bookmark";

export type RequestSessions = {
  primary: D1DatabaseSession;
  reviews: D1DatabaseSession;
};

export function createRequestSessions(
  database: D1Database,
  request: Request,
): RequestSessions {
  if (request.method !== "GET" && request.method !== "HEAD") {
    // Auth writes such as a username change also show in review lists, so
    // the bookmark must cover writes through both database handles.
    const session = database.withSession("first-primary");
    return { primary: session, reviews: session };
  }

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BOOKMARK_COOKIE}=`));
  let bookmark: string | undefined;
  if (cookie && cookie.length <= 1024) {
    try {
      bookmark = decodeURIComponent(cookie.slice(BOOKMARK_COOKIE.length + 1));
    } catch {
      // Ignore malformed cookies and start a new read session.
    }
  }
  return {
    primary: database.withSession("first-primary"),
    reviews: database.withSession(bookmark || "first-unconstrained"),
  };
}

export function setReviewBookmark(
  request: Request,
  response: Response,
  session: D1DatabaseSession,
) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const bookmark = session.getBookmark();
  if (!bookmark) return;

  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${BOOKMARK_COOKIE}=${encodeURIComponent(bookmark)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`,
  );
  response.headers.set("Cache-Control", "private, no-store");
}

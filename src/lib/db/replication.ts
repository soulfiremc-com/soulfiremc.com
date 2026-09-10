const BOOKMARK_COOKIE = "soulfire-d1-bookmark";

export function createReviewSession(database: D1Database, request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return database.withSession("first-primary");
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
  return database.withSession(bookmark || "first-unconstrained");
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

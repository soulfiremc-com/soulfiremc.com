import { createFileRoute } from "@tanstack/react-router";
import { getSortedBlogPages } from "@/lib/blog";
import { siteUrl } from "@/lib/site";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/blog/feed.xml")({
  server: {
    handlers: {
      GET: () => {
        const posts = getSortedBlogPages();

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>SoulFire Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Guides for testing Minecraft servers with bots: load, anti-bot, authentication, and proxies.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    ${posts
      .map((post) => {
        // A post without a date gets no pubDate, so its date stays stable.
        const pubDate = post.data.date
          ? `\n      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>`
          : "";

        return `
    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${siteUrl}${post.url}</link>
      <guid isPermaLink="true">${siteUrl}${post.url}</guid>
      <description>${escapeXml(post.data.description ?? "")}</description>${pubDate}
      ${post.data.author ? `<dc:creator>${escapeXml(post.data.author)}</dc:creator>` : ""}
      ${post.data.tags?.map((tag) => `<category>${escapeXml(tag)}</category>`).join("\n      ") || ""}
    </item>`;
      })
      .join("")}
  </channel>
</rss>`;

        return new Response(rss, {
          headers: {
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});

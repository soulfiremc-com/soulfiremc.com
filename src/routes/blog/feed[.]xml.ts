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
    <description>Latest updates, tutorials, and insights from the SoulFire team</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    ${posts
      .map((post) => {
        const pubDate = post.data.date
          ? new Date(post.data.date).toUTCString()
          : new Date().toUTCString();

        return `
    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${siteUrl}${post.url}</link>
      <guid isPermaLink="true">${siteUrl}${post.url}</guid>
      <description>${escapeXml(post.data.description ?? "")}</description>
      <pubDate>${pubDate}</pubDate>
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

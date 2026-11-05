import { createFileRoute } from "@tanstack/react-router";
import { getSortedBlogPages } from "@/lib/blog";
import { siteUrl } from "@/lib/site";

export const Route = createFileRoute("/blog/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = await getSortedBlogPages();

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Soulfire Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Latest updates, tutorials, and insights from the Soulfire team</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    ${posts
      .map((post) => {
        const pubDate = post.data.date
          ? new Date(post.data.date).toUTCString()
          : new Date().toUTCString();

        return `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <link>${siteUrl}${post.url}</link>
      <guid isPermaLink="true">${siteUrl}${post.url}</guid>
      <description><![CDATA[${post.data.description || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${post.data.author ? `<author>${post.data.author}</author>` : ""}
      ${post.data.tags?.map((tag) => `<category>${tag}</category>`).join("\n      ") || ""}
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

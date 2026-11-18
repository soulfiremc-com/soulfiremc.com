import { createFileRoute } from "@tanstack/react-router";
import { BlogOgImage } from "@/components/og/soulfire";
import { getReadingTime } from "@/lib/blog";
import { stripOgSuffix } from "@/lib/og";
import { createOgImageResponse, soulfireLogoDataUri } from "@/lib/og-image";
import { blogSource } from "@/lib/source";

function formatDate(date?: string | Date) {
  if (!date) return undefined;
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const Route = createFileRoute("/og/blog/{$}/image.webp")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const page = blogSource.getPage(stripOgSuffix(slugs));

        if (!page) return new Response(null, { status: 404 });

        return createOgImageResponse(
          <BlogOgImage
            title={page.data.title}
            description={page.data.description}
            author={page.data.author}
            date={formatDate(page.data.date)}
            tags={page.data.tags}
            readTime={`${getReadingTime(page.data.structuredData)} min`}
            logoSrc={soulfireLogoDataUri}
          />,
        );
      },
    },
  },
});

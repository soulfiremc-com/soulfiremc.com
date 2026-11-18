import type { InferPageType } from "fumadocs-core/source";
import { blogSource } from "@/lib/source";

type BlogPage = InferPageType<typeof blogSource>;

function normalizeDate(value: string | Date | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function getReadingTime(structuredData?: {
  contents?: { content: string }[];
}) {
  const text =
    structuredData?.contents?.map((item) => item.content).join(" ") ?? "";
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function getSortedBlogPages() {
  return blogSource.getPages().sort((left, right) => {
    const leftDate = left.data.date ? new Date(left.data.date).getTime() : 0;
    const rightDate = right.data.date ? new Date(right.data.date).getTime() : 0;
    return rightDate - leftDate;
  });
}

export function getBlogPostSummary(page: BlogPage) {
  const slug =
    // oxlint-disable-next-line unicorn/prefer-array-find -- this takes the last path segment; findLast needs the ES2023 lib
    page.slugs[0] ?? page.url.split("/").filter(Boolean).at(-1) ?? "";

  return {
    author: page.data.author,
    date: normalizeDate(page.data.date),
    description: page.data.description,
    path: page.path,
    readingTime: getReadingTime(page.data.structuredData),
    slug,
    structuredData: page.data.structuredData,
    tags: page.data.tags ?? [],
    title: page.data.title,
    url: page.url,
    cover: page.data.cover,
  };
}

export function getAllBlogPostSummaries() {
  return getSortedBlogPages().map(getBlogPostSummary);
}

export function getBlogPostData(slug: string) {
  const page = blogSource.getPage([slug]);
  if (!page) {
    return undefined;
  }

  const post = getBlogPostSummary(page);
  const relatedPosts =
    post.tags.length > 0
      ? getAllBlogPostSummaries()
          .filter((candidate) => candidate.slug !== slug)
          .filter((candidate) =>
            candidate.tags.some((tag) => post.tags.includes(tag)),
          )
          .slice(0, 3)
      : [];

  return {
    path: page.path,
    post,
    relatedPosts,
  };
}

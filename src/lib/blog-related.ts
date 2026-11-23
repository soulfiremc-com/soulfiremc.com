const RELATED_POST_LIMIT = 3;

/**
 * Picks the posts that share the most tags with `post`. Candidates arrive
 * newest first, and the stable sort keeps that order between equal matches.
 * Ranking by overlap matters because broad tags such as "minecraft" are on
 * every post and would otherwise always select the newest posts.
 */
export function pickRelatedPosts<T extends { slug: string; tags: string[] }>(
  post: T,
  candidates: T[],
) {
  const tags = new Set(post.tags);
  return candidates
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      candidate,
      shared: candidate.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .toSorted((left, right) => right.shared - left.shared)
    .slice(0, RELATED_POST_LIMIT)
    .map(({ candidate }) => candidate);
}

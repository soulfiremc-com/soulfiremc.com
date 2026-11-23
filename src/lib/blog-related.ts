const RELATED_POST_LIMIT = 3;

/**
 * Picks the posts that share the most tags with `post`. Candidates arrive
 * newest first, and the stable sort keeps that order between equal matches.
 * A tag on every post, such as "minecraft", says nothing about the topic, so
 * it does not count as a match.
 */
export function pickRelatedPosts<T extends { slug: string; tags: string[] }>(
  post: T,
  candidates: T[],
) {
  const others = candidates.filter((candidate) => candidate.slug !== post.slug);
  const tags = new Set(
    post.tags.filter(
      (tag) => !others.every((candidate) => candidate.tags.includes(tag)),
    ),
  );
  return others
    .map((candidate) => ({
      candidate,
      shared: candidate.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .toSorted((left, right) => right.shared - left.shared)
    .slice(0, RELATED_POST_LIMIT)
    .map(({ candidate }) => candidate);
}

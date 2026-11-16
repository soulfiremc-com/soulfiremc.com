const docsContentPathAttribute = "data-docs-content-path";

type ContentPreloader = (path: string) => Promise<unknown>;

let preloadContent: ContentPreloader | undefined;

export function setDocsContentPreloader(preloader: ContentPreloader) {
  preloadContent = preloader;
}

/**
 * Loads the MDX chunk of the server-rendered docs page before React hydrates.
 * Without it, the page content suspends during hydration. Any early update
 * then makes React discard the server HTML and render the content again.
 */
export async function preloadDocsContentForHydration(
  root: ParentNode = document,
) {
  const path = root
    .querySelector(`[${docsContentPathAttribute}]`)
    ?.getAttribute(docsContentPathAttribute);
  if (!path || !preloadContent) return;

  try {
    await preloadContent(path);
  } catch {
    // React loads the content again while rendering and reports the failure.
  }
}

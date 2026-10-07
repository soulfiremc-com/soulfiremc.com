import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { docsRedirects } from "../src/lib/docs/redirects";
import { loader, type VirtualFile } from "fumadocs-core/source";
import type { Node as PageTreeNode } from "fumadocs-core/page-tree";
import GithubSlugger from "github-slugger";
import {
  type FileObject,
  printErrors,
  scanURLs,
  validateFiles,
} from "next-validate-link";
import { remark } from "remark";
import remarkMdx from "remark-mdx";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const DOCS_DIR = path.join(process.cwd(), "content", "docs");
const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const REDIRECT_URLS = ["/demo-video", "/discord", "/donate", "/github"];

type AstNode = {
  alt?: string;
  children?: AstNode[];
  type?: string;
  value?: string;
};

type RouteFile = FileObject & {
  hashes: string[];
  populateKey: "blog/[slug]" | "docs/[[..._splat]]";
  routeValue: Record<string, string | string[]>;
};

async function checkLinks() {
  await checkNavigation();
  const files = await getFiles();
  const publicUrls = await getPublicUrls();

  const scanned = await scanURLs({
    preset: "tanstack-start",
    populate: {
      "docs/[[..._splat]]": files
        .filter((file) => file.populateKey === "docs/[[..._splat]]")
        .map((file) => ({
          value: { _splat: file.routeValue.slug },
          hashes: file.hashes,
        })),
      "blog/[slug]": files
        .filter((file) => file.populateKey === "blog/[slug]")
        .map((file) => ({
          value: file.routeValue,
          hashes: file.hashes,
        })),
    },
  });

  for (const url of [
    ...publicUrls,
    ...REDIRECT_URLS,
    ...[...docsRedirects.keys()].map((slug) => `/docs/${slug}`),
  ]) {
    scanned.urls.set(url, {});
  }

  for (const [slug, destination] of docsRedirects) {
    if (
      destination.startsWith("/docs/") &&
      !files.some((file) => file.url === destination)
    ) {
      throw new Error(
        `Broken documentation redirect: ${slug} -> ${destination}`,
      );
    }
  }

  printErrors(
    await validateFiles(files, {
      scanned,
      markdown: {
        components: {
          Card: { attributes: ["href"] },
        },
      },
      checkRelativePaths: "as-url",
    }),
    true,
  );
}

async function checkNavigation() {
  const metadataFiles = await walkFiles(
    DOCS_DIR,
    (filePath) => path.basename(filePath) === "meta.json",
  );
  for (const filePath of metadataFiles) {
    const metadata = JSON.parse(await readFile(filePath, "utf8")) as {
      pages?: string[];
      pagesIndex?: string;
      root?: boolean | string;
    };
    if (!metadata.pages) continue;
    const directory = path.dirname(filePath);
    const index = metadata.pagesIndex ?? "index";
    if (!metadata.root && metadata.pages.includes(index)) {
      throw new Error(
        `Section overview must be its collapsible heading, not a child: ${filePath}`,
      );
    }
    if (metadata.pagesIndex) {
      const indexPath = path.resolve(directory, metadata.pagesIndex);
      const matches = await Promise.allSettled([
        access(`${indexPath}.mdx`),
        access(`${indexPath}.md`),
      ]);
      if (!matches.some((result) => result.status === "fulfilled")) {
        throw new Error(`Missing section overview in ${filePath}`);
      }
    }
    const entries = await readdir(path.dirname(filePath));
    for (const page of metadata.pages) {
      // Fumadocs expands virtual sources and rest entries at load time.
      if (page.startsWith("...")) continue;
      if (
        !entries.includes(page) &&
        !entries.includes(`${page}.mdx`) &&
        !entries.includes(`${page}.md`)
      ) {
        throw new Error(`Missing sidebar entry ${page} in ${filePath}`);
      }
    }
  }

  const pageFiles = await walkMdxFiles(DOCS_DIR);
  const files: VirtualFile[] = pageFiles.map((filePath) => ({
    type: "page",
    path: toPosixPath(path.relative(DOCS_DIR, filePath)),
    // Ownership and URL checks need file paths, not compiled MDX content.
    data: { title: path.basename(filePath, ".mdx") },
  }));
  for (const filePath of metadataFiles) {
    files.push({
      type: "meta",
      path: toPosixPath(path.relative(DOCS_DIR, filePath)),
      data: JSON.parse(await readFile(filePath, "utf8")),
    });
  }
  const source = loader({ baseUrl: "/docs", source: { files } });
  const visible = new Set<string>();
  function collect(nodes: PageTreeNode[]) {
    for (const node of nodes) {
      const page =
        node.type === "page"
          ? node
          : node.type === "folder"
            ? node.index
            : undefined;
      if (page) {
        if (visible.has(page.url)) {
          throw new Error(`Duplicate sidebar page: ${page.url}`);
        }
        visible.add(page.url);
      }
      if (node.type === "folder") collect(node.children);
    }
  }
  collect(source.getPageTree().children);
  for (const page of source.getPages()) {
    if (!visible.has(page.url)) {
      throw new Error(
        `Documentation page is missing from the sidebar: ${page.url}`,
      );
    }
  }
  console.log(
    `Checked sidebar ownership for ${pageFiles.length} documentation pages.`,
  );
}

async function getFiles(): Promise<RouteFile[]> {
  const [docsFiles, blogFiles] = await Promise.all([
    getDocsFiles(),
    getBlogFiles(),
  ]);

  return [...docsFiles, ...blogFiles];
}

async function getPublicUrls(): Promise<string[]> {
  const files = await walkFiles(PUBLIC_DIR);

  return files.map(
    (filePath) => `/${toPosixPath(path.relative(PUBLIC_DIR, filePath))}`,
  );
}

async function getDocsFiles(): Promise<RouteFile[]> {
  const files = await walkMdxFiles(DOCS_DIR);

  return Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      const slugs = getDocsSlugs(filePath);

      return {
        path: filePath,
        content,
        url: toDocsUrl(slugs),
        hashes: getHeadings(content),
        populateKey: "docs/[[..._splat]]",
        routeValue: { slug: slugs },
      } satisfies RouteFile;
    }),
  );
}

async function getBlogFiles(): Promise<RouteFile[]> {
  const files = await walkMdxFiles(BLOG_DIR);

  return Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      const slug = getBlogSlug(filePath);

      return {
        path: filePath,
        content,
        url: `/blog/${slug}`,
        hashes: getHeadings(content),
        populateKey: "blog/[slug]",
        routeValue: { slug },
      } satisfies RouteFile;
    }),
  );
}

function getHeadings(content: string): string[] {
  const tree = remark().use(remarkMdx).parse(content);
  const slugger = new GithubSlugger();
  const headings: string[] = [];

  walk(tree as AstNode, (node) => {
    if (node.type !== "heading") {
      return;
    }

    const text = getNodeText(node).trim();
    if (text.length === 0) {
      return;
    }

    headings.push(slugger.slug(text));
  });

  return headings;
}

function getNodeText(node: AstNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }

  if (typeof node.alt === "string") {
    return node.alt;
  }

  if (!Array.isArray(node.children)) {
    return "";
  }

  return node.children.map((child) => getNodeText(child)).join("");
}

function walk(node: AstNode, visit: (node: AstNode) => void) {
  visit(node);

  if (!Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    walk(child, visit);
  }
}

function getDocsSlugs(filePath: string): string[] {
  const relative = toPosixPath(path.relative(DOCS_DIR, filePath));
  const withoutExtension = relative.replace(/\.mdx$/, "");
  const segments = withoutExtension
    .split("/")
    .filter((segment) => segment.length > 0)
    .filter((segment) => !/^\(.+\)$/.test(segment));

  if (segments.at(-1) === "index") {
    segments.pop();
  }

  return segments;
}

function getBlogSlug(filePath: string): string {
  return toPosixPath(path.relative(BLOG_DIR, filePath)).replace(/\.mdx$/, "");
}

function toDocsUrl(slugs: string[]): string {
  return slugs.length === 0 ? "/docs" : `/docs/${slugs.join("/")}`;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

async function walkMdxFiles(dir: string): Promise<string[]> {
  return walkFiles(dir, (filePath) => filePath.endsWith(".mdx"));
}

async function walkFiles(
  dir: string,
  predicate: (filePath: string) => boolean = () => true,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(fullPath, predicate);
      }

      if (entry.isFile() && predicate(fullPath)) {
        return [fullPath];
      }

      return [];
    }),
  );

  return nested.flat().sort();
}

void checkLinks();
